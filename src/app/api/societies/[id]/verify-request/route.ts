import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: society } = await supabase
      .from("societies").select("id, leader_id, verified").eq("id", id).single();
    if (!society) return NextResponse.json({ error: "Society not found." }, { status: 404 });
    if (society.leader_id !== user.id) return NextResponse.json({ error: "Only the leader can request verification." }, { status: 403 });
    if (society.verified) return NextResponse.json({ error: "Already verified." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("society_verification_requests").upsert(
      { society_id: id, status: "pending" },
      { onConflict: "society_id", ignoreDuplicates: true }
    );
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Verification request submitted. Admin will review within 48 hours." });
  } catch (err) {
    console.error("Verify request error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
