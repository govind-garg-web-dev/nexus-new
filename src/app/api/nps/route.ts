import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { score, comment } = await request.json();
    if (typeof score !== "number" || score < 0 || score > 10) {
      return NextResponse.json({ error: "score must be 0–10." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    await admin.from("nps_responses").upsert({
      user_id:  user.id,
      score,
      comment:  comment ?? null,
      responded_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("NPS error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
