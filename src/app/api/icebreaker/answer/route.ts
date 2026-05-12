import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CO_FOUNDER_QUESTIONS } from "@/lib/icebreaker-questions";

export async function POST(request: Request) {
  try {
    const { matchId, answer } = await request.json();

    if (!matchId || !answer?.trim()) {
      return NextResponse.json({ error: "matchId and answer are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Load match
    const { data: match } = await supabase
      .from("match_events")
      .select("id, user_a_id, user_b_id, status, user_a_answer, user_b_answer, intent")
      .eq("id", matchId)
      .single();

    if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    const iAmUserA = match.user_a_id === user.id;
    const iAmUserB = match.user_b_id === user.id;
    if (!iAmUserA && !iAmUserB) {
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    }

    const admin = createAdminClient();

    // Co-founder mode: 3 questions, tracked separately
    const isCoFounder = match.intent === "co_founder";

    if (isCoFounder) {
      // Parse existing answers as JSON array
      const existingA: string[] = match.user_a_answer ? JSON.parse(match.user_a_answer) : [];
      const existingB: string[] = match.user_b_answer ? JSON.parse(match.user_b_answer) : [];

      const myAnswers = iAmUserA ? existingA : existingB;
      const nextIdx   = myAnswers.length;

      if (nextIdx >= CO_FOUNDER_QUESTIONS.length) {
        return NextResponse.json({ error: "All questions already answered." }, { status: 400 });
      }

      myAnswers.push(answer);

      const updateField = iAmUserA ? { user_a_answer: JSON.stringify(myAnswers) } : { user_b_answer: JSON.stringify(myAnswers) };
      await admin.from("match_events").update(updateField).eq("id", matchId);

      const theirAnswers = iAmUserA ? existingB : existingA;
      const nextQuestion = nextIdx + 1 < CO_FOUNDER_QUESTIONS.length
        ? CO_FOUNDER_QUESTIONS[nextIdx + 1]
        : null;

      // Both finished all 3?
      const allDone = myAnswers.length >= CO_FOUNDER_QUESTIONS.length &&
                      theirAnswers.length >= CO_FOUNDER_QUESTIONS.length;

      if (allDone) {
        await admin.from("match_events").update({ status: "icebreaker_completed" }).eq("id", matchId);
      }

      return NextResponse.json({
        submitted: true,
        questionIndex: nextIdx,
        nextQuestion,
        allDone,
        readyToReveal: allDone,
      });
    }

    // Standard single-question icebreaker
    const updateField = iAmUserA ? { user_a_answer: answer } : { user_b_answer: answer };
    await admin.from("match_events").update(updateField).eq("id", matchId);

    // Re-fetch to check if both answered
    const { data: updated } = await admin
      .from("match_events")
      .select("user_a_answer, user_b_answer")
      .eq("id", matchId)
      .single();

    const bothAnswered = !!(updated?.user_a_answer && updated?.user_b_answer);

    if (bothAnswered) {
      await admin
        .from("match_events")
        .update({ status: "icebreaker_completed" })
        .eq("id", matchId);
    }

    return NextResponse.json({ submitted: true, bothAnswered, readyToReveal: bothAnswered });
  } catch (err) {
    console.error("Icebreaker answer error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
