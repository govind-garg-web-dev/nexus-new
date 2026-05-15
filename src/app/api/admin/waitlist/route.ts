import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin", "moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    const { data: entries } = await admin
      .from("waitlist")
      .select("id, phone, source, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    return NextResponse.json({ entries: entries ?? [], total: entries?.length ?? 0 });
  } catch (err) {
    console.error("Admin waitlist error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
