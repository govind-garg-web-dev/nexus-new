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

    // +3 reliability to solver for completing a session
    if (post.solver_id) {
      await admin.rpc("apply_score_event", {
        p_user_id:      post.solver_id,
        p_delta:        3,
        p_reason:       "collaboration_complete",
        p_reference_id: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complete consulting error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
