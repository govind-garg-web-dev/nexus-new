import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app/AppShell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // One verified getUser() call — this is the single JWT network round-trip
  // for the entire protected section. Everything else is DB queries.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Fetch userData + profile in parallel — saves ~150ms vs sequential
  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase
      .from("users")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("pseudonym, avatar_color, reliability_score, college")
      .eq("id", user.id)
      .single(),
  ]);

  if (!userData?.onboarding_complete) redirect("/onboarding");

  return (
    <AppShell profile={profile}>
      {children}
    </AppShell>
  );
}
