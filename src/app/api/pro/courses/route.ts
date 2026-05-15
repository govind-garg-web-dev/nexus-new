import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    let query = supabase
      .from("pro_courses")
      .select("id, category, title, description, difficulty, lessons, duration_hrs, thumbnail_url, order_idx")
      .eq("active", true)
      .order("order_idx");

    if (category) query = query.eq("category", category);

    const { data: courses } = await query;
    return NextResponse.json({ courses: courses ?? [] });
  } catch (err) {
    console.error("Courses GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
