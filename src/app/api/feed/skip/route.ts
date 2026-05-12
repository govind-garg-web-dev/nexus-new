import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { targetId } = await request.json();
    if (!targetId) return NextResponse.json({ error: "targetId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("feed_interactions")
      .insert({ actor_id: user.id, target_id: targetId, action: "skip" });

    if (error && error.code !== "23505") throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Skip error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
