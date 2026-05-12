import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import QuizChallenge from "@/components/app/QuizChallenge";

export default async function QuizChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("skill_challenges")
    .select("id, title, description, difficulty, time_limit_seconds, questions")
    .eq("id", id)
    .eq("category", "quiz")
    .single();

  if (!challenge) notFound();

  // Strip correct answers before sending to client
  const safeQuestions = (challenge.questions as Array<{ q: string; options: string[]; correct: number; explanation: string }>)
    .map(({ q, options }) => ({ q, options }));

  return <QuizChallenge challenge={{ ...challenge, questions: safeQuestions }} />;
}
