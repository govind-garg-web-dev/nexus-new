import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import WritingChallenge from "@/components/app/WritingChallenge";

export default async function WritingChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("skill_challenges")
    .select("id, title, description, difficulty, time_limit_seconds, word_limit")
    .eq("id", id)
    .eq("category", "writing")
    .single();

  if (!challenge) notFound();

  return <WritingChallenge challenge={challenge} />;
}
