import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcCompatibility, compatSummary, type RoommateProfile } from "@/lib/roommate-compat";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Get my roommate profile
    const { data: myProfile } = await supabase
      .from("roommate_profiles").select("*").eq("user_id", user.id).maybeSingle();

    if (!myProfile) return NextResponse.json({ noProfile: true, matches: [] });

    // Get user's college domain for scoping
    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();

    // Get all other active roommate profiles in the same college
    const { data: others } = await supabase
      .from("roommate_profiles")
      .select("user_id, sleep_schedule, cleanliness, visitors, diet, diet_pref, study_env, smoke, drink, weekend, wake_time, overnight, gender_pref, looking_for, budget_max, bio, active")
      .eq("active", true)
      .neq("user_id", user.id)
      .limit(100);

    if (!others?.length) return NextResponse.json({ noProfile: false, matches: [] });

    // Filter by college domain
    const otherIds = others.map((o) => o.user_id);
    const { data: domainUsers } = await supabase
      .from("users")
      .select("id, college_domain")
      .in("id", otherIds)
      .eq("college_domain", userData?.college_domain ?? "");

    const campusIds = new Set((domainUsers ?? []).map((u) => u.id));
    const campusOthers = others.filter((o) => campusIds.has(o.user_id));

    if (!campusOthers.length) return NextResponse.json({ noProfile: false, matches: [] });

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color, reliability_score, college, branch, batch_year")
      .in("id", campusOthers.map((o) => o.user_id));

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    // Calculate compatibility for each
    const matches = campusOthers
      .map((other) => {
        const compat = calcCompatibility(myProfile as RoommateProfile, other as RoommateProfile);
        return {
          userId:       other.user_id,
          profile:      profileMap[other.user_id] ?? null,
          score:        compat.score,
          incompatible: compat.incompatible,
          summary:      compatSummary(compat),
          diffs:        compat.diffs,
          lookingFor:   other.looking_for,
          budgetMax:    other.budget_max,
          bio:          other.bio,
        };
      })
      .filter((m) => !m.incompatible)     // hide hard mismatches (they appear at the bottom)
      .sort((a, b) => b.score - a.score); // highest compatibility first

    // Append incompatibles at end, clearly marked
    const incompatibles = campusOthers
      .map((other) => {
        const compat = calcCompatibility(myProfile as RoommateProfile, other as RoommateProfile);
        if (!compat.incompatible) return null;
        return {
          userId:       other.user_id,
          profile:      profileMap[other.user_id] ?? null,
          score:        -1,
          incompatible: true,
          summary:      compatSummary(compat),
          diffs:        compat.diffs,
          lookingFor:   other.looking_for,
          budgetMax:    other.budget_max,
          bio:          other.bio,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ noProfile: false, matches: [...matches, ...incompatibles] });
  } catch (err) {
    console.error("Roommate feed error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
