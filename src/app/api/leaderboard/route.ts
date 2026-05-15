import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();
    const { data: profile } = await supabase
      .from("profiles").select("college").eq("id", user.id).single();

    // Get all profiles in the same college with badge counts
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color, reliability_score, vault_karma")
      .eq("college", profile?.college ?? "")
      .limit(200);

    if (!profiles?.length) return NextResponse.json({ leaderboard: [] });

    const profileIds = profiles.map((p) => p.id);

    // Badge counts
    const { data: badges } = await supabase
      .from("badges")
      .select("user_id")
      .in("user_id", profileIds)
      .gt("expires_at", new Date().toISOString());

    const badgeCount: Record<string, number> = {};
    for (const b of badges ?? []) {
      badgeCount[b.user_id] = (badgeCount[b.user_id] ?? 0) + 1;
    }

    // Streaks
    const { data: streaks } = await supabase
      .from("user_streaks")
      .select("user_id, current_streak, longest_streak")
      .in("user_id", profileIds);

    const streakMap = Object.fromEntries((streaks ?? []).map((s) => [s.user_id, s]));

    // Compute score: badges×15 + reliability_score + vault_karma×0.5 + streak×5
    const leaderboard = profiles
      .map((p) => {
        const badges   = badgeCount[p.id] ?? 0;
        const streak   = streakMap[p.id]?.current_streak ?? 0;
        const score    = badges * 15 + (p.reliability_score ?? 70) + Math.floor((p.vault_karma ?? 0) * 0.5) + streak * 5;
        return {
          userId:           p.id,
          pseudonym:        p.pseudonym,
          avatarColor:      p.avatar_color,
          reliabilityScore: p.reliability_score,
          badgeCount:       badges,
          currentStreak:    streak,
          longestStreak:    streakMap[p.id]?.longest_streak ?? 0,
          vaultKarma:       p.vault_karma,
          score,
          isMe:             p.id === user.id,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return NextResponse.json({ leaderboard, college: profile?.college });
  } catch (err) {
    console.error("Leaderboard GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
