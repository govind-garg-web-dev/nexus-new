import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app/AppShell";
import NpsPrompt from "@/components/app/NpsPrompt";
import CoinToast from "@/components/app/CoinToast";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase.from("users").select("onboarding_complete").eq("id", user.id).single(),
    supabase.from("profiles")
      .select("pseudonym, avatar_color, reliability_score, college, coins_balance")
      .eq("id", user.id).single(),
  ]);

  if (!userData?.onboarding_complete) redirect("/onboarding");

  return (
    <AppShell profile={profile}>
      {children}
      <NpsPrompt userId={user.id} />
      {/* Real-time coin credit notifications */}
      <CoinToast userId={user.id} />
    </AppShell>
  );
}
