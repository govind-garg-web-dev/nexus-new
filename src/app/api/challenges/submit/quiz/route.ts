import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PASS_THRESHOLD = 0.7; // 70% to earn badge

export async function POST(request: Request) {
  try {
    const { challengeId, answers, timeTakenSeconds } = await request.json();

    if (!challengeId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "challengeId and answers are required." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: challenge } = await userClient
      .from("skill_challenges")
      .select("id, difficulty, questions")
      .eq("id", challengeId)
      .eq("category", "quiz")
      .single();

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

    const questions: Array<{ correct: number; explanation: string }> = challenge.questions ?? [];

    // Grade
    let correct = 0;
    const breakdown = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) correct++;
      return { index: i, correct: isCorrect, explanation: q.explanation };
    });

    const score      = Math.round((correct / questions.length) * 100);
    const passed     = score >= PASS_THRESHOLD * 100;
    const status     = passed ? "passed" : "failed";

    const admin = createAdminClient();

    const { data: submission } = await admin
      .from("challenge_submissions")
      .insert({
        user_id:            user.id,
        challenge_id:       challengeId,
        status,
        submitted_answers:  answers,
        score,
        time_taken_seconds: timeTakenSeconds ?? null,
      })
      .select("id")
      .single();

    if (passed && submission) {
      await admin.from("badges").upsert({
        user_id:       user.id,
        challenge_id:  challengeId,
        submission_id: submission.id,
        category:      "quiz",
        difficulty:    challenge.difficulty,
      }, { onConflict: "user_id,challenge_id", ignoreDuplicates: true });

      await admin.rpc("apply_score_event", {
        p_user_id:      user.id,
        p_delta:        3,
        p_reason:       "badge_earned",
        p_reference_id: submission.id,
      });
    }

    return NextResponse.json({ status, passed, score, correct, total: questions.length, breakdown });
  } catch (err) {
    console.error("Quiz submit error:", err);
    return NextResponse.json({ error: "Submission failed." }, { status: 500 });
  }
}
