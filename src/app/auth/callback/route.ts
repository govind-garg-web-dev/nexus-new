import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCollegeEmail } from "@/lib/college-domains";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
  }

  // College email gate
  const validation = validateCollegeEmail(data.user.email);
  if (!validation.valid) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/sign-in?error=invalid_domain&msg=${encodeURIComponent(validation.reason)}`
    );
  }

  // Check onboarding status
  const { data: userData } = await supabase
    .from("users")
    .select("onboarding_complete")
    .eq("id", data.user.id)
    .single();

  if (!userData?.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
