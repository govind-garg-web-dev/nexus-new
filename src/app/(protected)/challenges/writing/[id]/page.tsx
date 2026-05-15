import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WritingChallenge from "@/components/app/WritingChallenge";
import SubmissionStatus from "@/components/app/SubmissionStatus";

export default async function WritingChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, userId] = await Promise.all([createClient(), getUserId()]);

  const [{ data: challenge }, { data: existing }] = await Promise.all([
    supabase
      .from("skill_challenges")
      .select("id, title, description, difficulty, time_limit_seconds, word_limit")
      .eq("id", id)
      .eq("category", "writing")
      .single(),
    supabase
      .from("challenge_submissions")
      .select("id, status, submitted_text, created_at")
      .eq("challenge_id", id)
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!challenge) notFound();

  // If user has a submission under review or passed, show status instead of the form
  if (existing && (existing.status === "under_review" || existing.status === "passed")) {
    return (
      <SubmissionStatus
        submissionId={existing.id}
        status={existing.status}
        submittedText={existing.submitted_text ?? undefined}
        challengeTitle={challenge.title}
        category="writing"
        challengeId={id}
      />
    );
  }

  return <WritingChallenge challenge={challenge} />;
}
