import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: totalUsers },
      { count: activeUsers7d },
      { count: pendingReports },
      { count: pendingConfessions },
      { count: totalBadges },
      { count: totalSocieties },
      { count: verifiedSocieties },
      { data: topCampuses },
    ] = await Promise.all([
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since7d),
      admin.from("report_log").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("confessions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("badges").select("id", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
      admin.from("societies").select("id", { count: "exact", head: true }),
      admin.from("societies").select("id", { count: "exact", head: true }).eq("verified", true),
      admin.from("users").select("college_domain").limit(1000),
    ]);

    // Campus breakdown
    const campusCount: Record<string, number> = {};
    for (const u of topCampuses ?? []) {
      campusCount[u.college_domain] = (campusCount[u.college_domain] ?? 0) + 1;
    }
    const campusBreakdown = Object.entries(campusCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return NextResponse.json({
      totalUsers:          totalUsers ?? 0,
      activeUsers7d:       activeUsers7d ?? 0,
      pendingReports:      pendingReports ?? 0,
      pendingConfessions:  pendingConfessions ?? 0,
      totalBadges:         totalBadges ?? 0,
      totalSocieties:      totalSocieties ?? 0,
      verifiedSocieties:   verifiedSocieties ?? 0,
      campusBreakdown,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
