import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: circles } = await supabase
      .from("mental_health_circles")
      .select("id, topic, description, icon, color")
      .eq("is_active", true)
      .order("topic");

    return NextResponse.json({ circles: circles ?? [] });
  } catch (err) {
    console.error("Circles GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
