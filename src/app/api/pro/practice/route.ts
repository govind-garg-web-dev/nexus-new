import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category   = searchParams.get("category") || "";
    const difficulty = searchParams.get("difficulty") || "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    let query = supabase
      .from("practice_questions")
      .select("id, category, sub_category, title, difficulty, tags")
      .order("created_at", { ascending: false })
      .limit(50);

    if (category)   query = query.eq("category", category);
    if (difficulty) query = query.eq("difficulty", difficulty);

    const { data: questions } = await query;
    return NextResponse.json({ questions: questions ?? [] });
  } catch (err) {
    console.error("Practice GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
