import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: lobbies } = await supabase
      .from("event_lobbies")
      .select("id, looking_for, team_size, slots_needed, badge_filter, locked, created_at, user_id")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (!lobbies?.length) return NextResponse.json({ lobbies: [] });

    const userIds = lobbies.map((l) => l.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color, reliability_score")
      .in("id", userIds);

    const { data: badges } = await supabase
      .from("badges")
      .select("user_id, category, difficulty")
      .in("user_id", userIds)
      .gt("expires_at", new Date().toISOString());

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const badgeMap: Record<string, typeof badges> = {};
    for (const b of badges ?? []) {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id]!.push(b);
    }

    // Get reply count per lobby
    const lobbyIds = lobbies.map((l) => l.id);
    const { data: replies } = await supabase
      .from("lobby_replies")
      .select("lobby_id")
      .in("lobby_id", lobbyIds);

    const replyCount: Record<string, number> = {};
    for (const r of replies ?? []) {
      replyCount[r.lobby_id] = (replyCount[r.lobby_id] ?? 0) + 1;
    }

    // Check if current user has already applied to each lobby
    const { data: myReplies } = await supabase
      .from("lobby_replies")
      .select("lobby_id")
      .eq("applicant_id", user.id)
      .in("lobby_id", lobbyIds);

    const myAppliedSet = new Set((myReplies ?? []).map((r) => r.lobby_id));

    const enriched = lobbies.map((l) => ({
      ...l,
      poster:    profileMap[l.user_id] ?? null,
      badges:    badgeMap[l.user_id] ?? [],
      replies:   replyCount[l.id] ?? 0,
      isMyPost:  l.user_id === user.id,
      hasApplied: myAppliedSet.has(l.id),
    }));

    return NextResponse.json({ lobbies: enriched });
  } catch (err) {
    console.error("Lobby GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { lookingFor, teamSize, slotsNeeded, badgeFilter } = await request.json();
    if (!lookingFor?.trim()) {
      return NextResponse.json({ error: "lookingFor is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("event_lobbies").insert({
      event_id:     id,
      user_id:      user.id,
      looking_for:  lookingFor.trim(),
      team_size:    teamSize    ?? 1,
      slots_needed: slotsNeeded ?? 1,
      badge_filter: badgeFilter || null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "You already have a lobby post for this event." }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lobby POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
