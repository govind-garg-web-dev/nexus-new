import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app/AppShell";
import NpsPrompt from "@/components/app/NpsPrompt";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase.from("users").select("onboarding_complete").eq("id", user.id).single(),
    supabase.from("profiles").select("pseudonym, avatar_color, reliability_score, college").eq("id", user.id).single(),
  ]);

  if (!userData?.onboarding_complete) redirect("/onboarding");

  return (
    <AppShell profile={profile}>
      {children}
      {/* NPS prompt — shows after 3 days, non-intrusive */}
      <NpsPrompt userId={user.id} />
    </AppShell>
  );
}
