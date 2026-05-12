import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateCollegeEmail } from "@/lib/college-domains";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/feed", "/chat", "/challenges", "/co-founder"];
// Routes only for unauthenticated users
const AUTH_ONLY_ROUTES = ["/sign-in"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must be called before any redirects
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Unauthenticated user hitting a protected route ──
  if (!user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // ── Authenticated user hitting sign-in → redirect to dashboard ──
  if (user && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── College email gate: reject non-college emails ──
  if (user && user.email) {
    const validation = validateCollegeEmail(user.email);
    if (!validation.valid) {
      // Sign them out and redirect to sign-in with error
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("error", "invalid_domain");
      return NextResponse.redirect(url);
    }

    // ── Onboarding gate: force onboarding if not complete ──
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/feed")) {
      const { data: userData } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      if (userData && !userData.onboarding_complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
