import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data } = await supabase
      .from("roommate_profiles").select("*").eq("user_id", user.id).maybeSingle();

    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("Roommate profile GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["sleep_schedule","cleanliness","visitors","diet","diet_pref","study_env","smoke","drink","weekend","wake_time","overnight","gender_pref"];
    const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
    if (missing.length) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("roommate_profiles").upsert({
      user_id:        user.id,
      sleep_schedule: body.sleep_schedule,
      cleanliness:    body.cleanliness,
      visitors:       body.visitors,
      diet:           body.diet,
      diet_pref:      body.diet_pref,
      study_env:      body.study_env,
      smoke:          body.smoke,
      drink:          body.drink,
      weekend:        body.weekend,
      wake_time:      body.wake_time,
      overnight:      body.overnight,
      gender_pref:    body.gender_pref,
      looking_for:    body.looking_for    ?? "any",
      budget_max:     body.budget_max     ?? null,
      move_in_date:   body.move_in_date   ?? null,
      bio:            body.bio?.trim()    ?? null,
      active:         true,
    }, { onConflict: "user_id" });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Roommate profile POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
