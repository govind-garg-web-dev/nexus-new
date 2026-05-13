import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; lobbyId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { lobbyId } = await params;
  try {
    const { note } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: lobby } = await supabase
      .from("event_lobbies")
      .select("id, user_id, locked, badge_filter")
      .eq("id", lobbyId)
      .single();

    if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
    if (lobby.locked) return NextResponse.json({ error: "This team is already locked." }, { status: 400 });
    if (lobby.user_id === user.id) return NextResponse.json({ error: "Cannot apply to your own post." }, { status: 400 });

    // Badge filter check
    if (lobby.badge_filter) {
      const { data: badge } = await supabase
        .from("badges").select("id").eq("user_id", user.id).eq("category", lobby.badge_filter)
        .gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!badge) return NextResponse.json({
        error: `This post requires a ${lobby.badge_filter} badge.`
      }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("lobby_replies").insert({
      lobby_id:     lobbyId,
      applicant_id: user.id,
      note:         note?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "You already applied to this team." }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
