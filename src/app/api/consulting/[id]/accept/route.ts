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
      .select("id, poster_id, status, badge_needed, room_id")
      .eq("id", id)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (post.status !== "open") return NextResponse.json({ error: "This post has already been accepted." }, { status: 400 });
    if (post.poster_id === user.id) return NextResponse.json({ error: "Cannot accept your own post." }, { status: 400 });

    // Check solver has the required badge
    if (post.badge_needed) {
      const { data: badge } = await supabase
        .from("badges")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", post.badge_needed)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!badge) {
        return NextResponse.json({
          error: `You need an active ${post.badge_needed} badge to accept this blocker.`
        }, { status: 403 });
      }
    }

    const admin = createAdminClient();
    await admin.from("micro_consulting").update({
      status:      "accepted",
      solver_id:   user.id,
      accepted_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ success: true, roomId: post.room_id });
  } catch (err) {
    console.error("Accept consulting error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
