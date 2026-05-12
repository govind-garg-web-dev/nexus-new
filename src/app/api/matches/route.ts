import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: matches } = await supabase
      .from("match_events")
      .select(`
        id, status, intent, icebreaker_question,
        user_a_id, user_b_id,
        user_a_answer, user_b_answer,
        revealed_at, created_at
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .neq("status", "ghosted")
      .neq("status", "blocked")
      .order("created_at", { ascending: false });

    if (!matches || matches.length === 0) return NextResponse.json({ matches: [] });

    // Get pseudonyms for the other party in each match
    const otherIds = matches.map((m) =>
      m.user_a_id === user.id ? m.user_b_id : m.user_a_id
    );
    const uniqueOtherIds = [...new Set(otherIds)];

    const { data: otherProfiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color, reliability_score")
      .in("id", uniqueOtherIds);

    const { data: otherBadges } = await supabase
      .from("badges")
      .select("user_id, category, difficulty")
      .in("user_id", uniqueOtherIds)
      .gt("expires_at", new Date().toISOString());

    const profileMap = Object.fromEntries(
      (otherProfiles ?? []).map((p) => [p.id, p])
    );
    const badgeMap: Record<string, typeof otherBadges> = {};
    for (const b of otherBadges ?? []) {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id]!.push(b);
    }

    const enriched = matches.map((m) => {
      const otherId  = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
      const iAmUserA = m.user_a_id === user.id;
      const myAnswer = iAmUserA ? m.user_a_answer : m.user_b_answer;
      const theirAnswer = iAmUserA ? m.user_b_answer : m.user_a_answer;

      return {
        id:                  m.id,
        status:              m.status,
        intent:              m.intent,
        icebreakerQuestion:  m.icebreaker_question,
        myAnswer,
        theirAnswered:       !!theirAnswer,
        createdAt:           m.created_at,
        revealedAt:          m.revealed_at,
        other: {
          id:               otherId,
          ...profileMap[otherId],
          badges:           badgeMap[otherId] ?? [],
        },
      };
    });

    return NextResponse.json({ matches: enriched });
  } catch (err) {
    console.error("Matches error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
