import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// GET — list pending society verification requests (admin)
export async function GET(_req: Request, { params: _ }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    const { data } = await admin
      .from("society_verification_requests")
      .select("id, status, notes, created_at, society_id, societies(name, college, category, bio, leader_id)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    console.error("Society verify GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — approve or reject a society verification request
export async function POST(request: Request, { params }: Params) {
  const { id } = await params; // this is the society_id
  try {
    const { action, notes } = await request.json(); // action: 'approve' | 'reject'

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role)) return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();

    await admin.from("society_verification_requests").update({
      status:      action === "approve" ? "approved" : "rejected",
      notes:       notes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("society_id", id);

    if (action === "approve") {
      await admin.from("societies").update({ verified: true }).eq("id", id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Society verify POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
