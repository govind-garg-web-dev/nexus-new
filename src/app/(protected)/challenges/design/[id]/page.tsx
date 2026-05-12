import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DesignChallenge from "@/components/app/DesignChallenge";

export default async function DesignChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("skill_challenges")
    .select("id, title, description, difficulty, time_limit_seconds, reference_image_url")
    .eq("id", id)
    .eq("category", "design")
    .single();

  if (!challenge) notFound();

  return <DesignChallenge challenge={challenge} />;
}
