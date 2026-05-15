import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const today = new Date().toISOString().split("T")[0];

    // Get today's daily challenges
    const { data: assignments } = await supabase
      .from("daily_challenge_assignments")
      .select("challenge_id, skill_challenges(id, title, category, difficulty, description, time_limit_seconds)")
      .eq("assigned_date", today);

    // Get user's streak
    const { data: streak } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, total_completions, last_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get today's completions for this user
    const challengeIds = (assignments ?? []).map((a) => a.challenge_id);
    const { data: todayBadges } = challengeIds.length
      ? await supabase
          .from("challenge_submissions")
          .select("challenge_id")
          .eq("user_id", user.id)
          .eq("status", "passed")
          .in("challenge_id", challengeIds)
          .gte("created_at", `${today}T00:00:00Z`)
      : { data: [] };

    const completedToday = new Set((todayBadges ?? []).map((b) => b.challenge_id));

    const dailyChallenges = (assignments ?? []).map((a) => ({
      ...(a.skill_challenges as object),
      completedToday: completedToday.has(a.challenge_id),
    }));

    return NextResponse.json({
      dailyChallenges,
      streak: streak ?? { current_streak: 0, longest_streak: 0, total_completions: 0, last_completed_at: null },
    });
  } catch (err) {
    console.error("Daily challenges GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — admin assigns a daily challenge
export async function POST(request: Request) {
  try {
    const { challengeId, date } = await request.json();
    if (!challengeId) return NextResponse.json({ error: "challengeId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!userData || !["admin", "moderator"].includes(userData.role))
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("daily_challenge_assignments").upsert({
      challenge_id:  challengeId,
      assigned_date: date ?? new Date().toISOString().split("T")[0],
    }, { onConflict: "assigned_date,challenge_id", ignoreDuplicates: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Daily challenge POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
