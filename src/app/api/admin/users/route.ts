export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q    = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "0");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();

    // Get users with profiles
    let query = admin
      .from("users")
      .select("id, email, college_domain, role, is_suspended, is_suspended, onboarding_complete, created_at")
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);

    if (q) query = query.or(`email.ilike.%${q}%,college_domain.ilike.%${q}%`);

    const { data: users } = await query;

    // Get profiles for pseudonyms
    const ids = (users ?? []).map((u) => u.id);
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, pseudonym, reliability_score").in("id", ids)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const enriched = (users ?? []).map((u) => ({ ...u, profile: profileMap[u.id] ?? null }));

    return NextResponse.json({ users: enriched });
  } catch (err) {
    console.error("Admin users error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
