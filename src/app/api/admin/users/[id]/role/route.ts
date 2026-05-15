import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { role } = await request.json();
    if (!["user", "moderator", "admin"].includes(role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || me.role !== "admin") return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("users").update({ role }).eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Role update error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
