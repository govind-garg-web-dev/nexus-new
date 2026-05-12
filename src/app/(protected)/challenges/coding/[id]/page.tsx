import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CodingChallenge from "@/components/app/CodingChallenge";

export default async function CodingChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("skill_challenges")
    .select("id, title, description, difficulty, time_limit_seconds, starter_code, language_default, test_cases")
    .eq("id", id)
    .eq("category", "coding")
    .single();

  if (!challenge) notFound();

  return <CodingChallenge challenge={challenge} />;
}
