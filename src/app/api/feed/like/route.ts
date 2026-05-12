import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickIcebreakerQuestion, CO_FOUNDER_QUESTIONS } from "@/lib/icebreaker-questions";

export async function POST(request: Request) {
  try {
    const { targetId, intent } = await request.json();
    if (!targetId) return NextResponse.json({ error: "targetId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();

    // Record the like
    const { error: likeErr } = await admin
      .from("feed_interactions")
      .insert({ actor_id: user.id, target_id: targetId, action: "like" });

    if (likeErr && likeErr.code !== "23505") throw likeErr;

    // Check for mutual like
    const { data: theirLike } = await admin
      .from("feed_interactions")
      .select("id")
      .eq("actor_id", targetId)
      .eq("target_id", user.id)
      .eq("action", "like")
      .maybeSingle();

    if (!theirLike) {
      return NextResponse.json({ mutual: false });
    }

    // Check if match_event already exists
    const { data: existingMatch } = await admin
      .from("match_events")
      .select("id, status")
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${targetId}),and(user_a_id.eq.${targetId},user_b_id.eq.${user.id})`)
      .maybeSingle();

    if (existingMatch) {
      return NextResponse.json({ mutual: true, matchId: existingMatch.id, alreadyMatched: true });
    }

    // Pick icebreaker question based on shared badges
    const [{ data: myBadges }, { data: theirBadges }] = await Promise.all([
      admin.from("badges").select("category").eq("user_id", user.id).gt("expires_at", new Date().toISOString()),
      admin.from("badges").select("category").eq("user_id", targetId).gt("expires_at", new Date().toISOString()),
    ]);

    const isCoFounderIntent = intent === "co_founder";
    const question = isCoFounderIntent
      ? CO_FOUNDER_QUESTIONS[0] // first of 3
      : pickIcebreakerQuestion(
          (myBadges ?? []).map((b) => b.category),
          (theirBadges ?? []).map((b) => b.category)
        );

    // Create match event
    const { data: matchEvent } = await admin
      .from("match_events")
      .insert({
        user_a_id:           user.id,
        user_b_id:           targetId,
        status:              "mutual",
        intent:              intent ?? "general",
        icebreaker_question: question,
      })
      .select("id")
      .single();

    return NextResponse.json({ mutual: true, matchId: matchEvent?.id });
  } catch (err) {
    console.error("Like error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
