import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { challengeId, text, timeTakenSeconds } = await request.json();

    if (!challengeId || !text?.trim()) {
      return NextResponse.json({ error: "challengeId and text are required." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: challenge } = await userClient
      .from("skill_challenges")
      .select("id, difficulty, word_limit")
      .eq("id", challengeId)
      .eq("category", "writing")
      .single();

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

    const wordCount = text.trim().split(/\s+/).length;
    if (challenge.word_limit && wordCount > challenge.word_limit * 1.1) {
      return NextResponse.json({
        error: `Exceeds word limit (${wordCount} / ${challenge.word_limit} words).`
      }, { status: 400 });
    }

    const admin = createAdminClient();

    // Writing goes to peer review queue — badge minted after 2 approvals
    await admin
      .from("challenge_submissions")
      .insert({
        user_id:            user.id,
        challenge_id:       challengeId,
        status:             "under_review",
        submitted_text:     text,
        time_taken_seconds: timeTakenSeconds ?? null,
      });

    return NextResponse.json({
      status: "under_review",
      badgeMinted: false,
      wordCount,
      message: "Submitted for peer review. Your badge will be minted after 2 approvals from verified writers.",
    });
  } catch (err) {
    console.error("Writing submit error:", err);
    return NextResponse.json({ error: "Submission failed." }, { status: 500 });
  }
}
