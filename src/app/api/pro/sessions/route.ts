import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: sessions } = await supabase
      .from("group_sessions")
      .select("id, type, title, description, host_name, scheduled_at, duration_mins, max_participants, status")
      .in("status", ["upcoming", "live"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20);

    // Get registration counts + user's registrations
    const sessionIds = (sessions ?? []).map((s) => s.id);
    const [{ data: regCounts }, { data: myRegs }] = await Promise.all([
      sessionIds.length
        ? supabase.from("session_registrations").select("session_id").in("session_id", sessionIds)
        : { data: [] },
      sessionIds.length
        ? supabase.from("session_registrations").select("session_id").eq("user_id", user.id).in("session_id", sessionIds)
        : { data: [] },
    ]);

    const countMap: Record<string, number> = {};
    for (const r of regCounts ?? []) countMap[r.session_id] = (countMap[r.session_id] ?? 0) + 1;
    const myRegSet = new Set((myRegs ?? []).map((r) => r.session_id));

    const enriched = (sessions ?? []).map((s) => ({
      ...s,
      registeredCount: countMap[s.id] ?? 0,
      isRegistered:    myRegSet.has(s.id),
    }));

    return NextResponse.json({ sessions: enriched });
  } catch (err) {
    console.error("Sessions GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
