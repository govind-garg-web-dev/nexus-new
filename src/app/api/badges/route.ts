import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: badges } = await supabase
      .from("badges")
      .select(`
        id, category, difficulty, expires_at, created_at,
        skill_challenges ( title )
      `)
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    return NextResponse.json({ badges: badges ?? [] });
  } catch (err) {
    console.error("Badges fetch error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
