import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateCollegeEmail } from "@/lib/college-domains";

const PROTECTED_ROUTES = ["/dashboard", "/pro", "/profile", "/feed", "/chat", "/challenges", "/co-founder", "/vault", "/study-rooms", "/consulting", "/events", "/referrals", "/carpool", "/roommates", "/confessions", "/marketplace", "/circles", "/societies", "/daily", "/leaderboard", "/mod", "/admin"];
const SUSPENSION_EXEMPT = ["/suspended", "/sign-in", "/api"];
const AUTH_ONLY_ROUTES = ["/sign-in"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── getSession() reads the JWT from the cookie — zero network call.
  // We use it here only for routing decisions (redirect logic).
  // Actual security enforcement (JWT verification) happens in server
  // components and API routes via getUser().
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;

  // Unauthenticated → protected route
  if (!user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Authenticated → sign-in page
  if (user && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // College email gate (reads from JWT payload — no extra network call)
  if (user?.email) {
    const validation = validateCollegeEmail(user.email);
    if (!validation.valid) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("error", "invalid_domain");
      return NextResponse.redirect(url);
    }
  }

  // Suspension gate — suspended users only see /suspended page
  // We check the JWT metadata for suspension to avoid a DB call in middleware.
  // The actual suspension flag is set via DB; the next login will reflect it.
  if (user && !SUSPENSION_EXEMPT.some((r) => pathname.startsWith(r))) {
    // Check suspension flag from user metadata (set when score drops below 25)
    // This is stored server-side in users table; we do a lightweight session check
    const isSuspended = session?.user?.user_metadata?.is_suspended === true;
    if (isSuspended && pathname !== "/suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }
  }

  // Onboarding gate handled in the protected layout.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
