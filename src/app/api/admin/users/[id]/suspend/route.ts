import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { suspend, reason } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin", "moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin/moderator only." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("users").update({
      is_suspended:      !!suspend,
      suspension_reason: suspend ? (reason ?? "Manual suspension by admin") : null,
      suspended_at:      suspend ? new Date().toISOString() : null,
    }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Suspend error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
