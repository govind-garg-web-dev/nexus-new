import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin", "moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();

    // Get campuses with user counts
    const { data: campuses } = await admin
      .from("campuses")
      .select("id, name, domain, city, state, student_count, active, onboarded_at")
      .order("onboarded_at", { ascending: false });

    // Get user count per domain
    const domains = (campuses ?? []).map((c) => c.domain);
    const { data: userCounts } = domains.length
      ? await admin.from("users").select("college_domain").in("college_domain", domains)
      : { data: [] };

    const countMap: Record<string, number> = {};
    for (const u of userCounts ?? []) {
      countMap[u.college_domain] = (countMap[u.college_domain] ?? 0) + 1;
    }

    const enriched = (campuses ?? []).map((c) => ({ ...c, userCount: countMap[c.domain] ?? 0 }));
    return NextResponse.json({ campuses: enriched });
  } catch (err) {
    console.error("Campuses GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, domain, city, state, studentCount } = await request.json();
    if (!name || !domain) return NextResponse.json({ error: "name and domain required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    const { error } = await admin.from("campuses").insert({
      name, domain: domain.toLowerCase().trim(),
      city: city ?? null, state: state ?? null,
      student_count: studentCount ?? null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Domain already exists." }, { status: 400 });
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Campuses POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
