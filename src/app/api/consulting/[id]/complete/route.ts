import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: post } = await supabase
      .from("micro_consulting")
      .select("id, poster_id, solver_id, status")
      .eq("id", id)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (post.poster_id !== user.id && post.solver_id !== user.id)
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    if (post.status !== "accepted")
      return NextResponse.json({ error: "Session is not active." }, { status: 400 });

    const admin = createAdminClient();
    await admin.from("micro_consulting").update({ status: "completed" }).eq("id", id);

    if (post.solver_id) {
      // +3 reliability score
      await admin.rpc("apply_score_event", {
        p_user_id:      post.solver_id,
        p_delta:        3,
        p_reason:       "collaboration_complete",
        p_reference_id: id,
      });

      // Award coins from config
      const { data: configRow } = await admin
        .from("coin_config").select("coins").eq("action_key", "consulting_help").single();
      const coins = configRow?.coins ?? 20;
      await admin.rpc("award_coins", {
        p_user_id:   post.solver_id,
        p_amount:    coins,
        p_reason:    "consulting_help",
        p_reference: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complete consulting error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
