import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Internal helper — called server-side from other API routes
export async function POST(request: Request) {
  try {
    const { userId, amount, reason, referenceId } = await request.json();
    if (!userId || !amount || !reason)
      return NextResponse.json({ error: "userId, amount, reason required." }, { status: 400 });

    // Verify caller is authenticated (basic guard — real security is service_role)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("award_coins", {
      p_user_id:   userId,
      p_amount:    amount,
      p_reason:    reason,
      p_reference: referenceId ?? null,
    });

    if (error) throw error;
    return NextResponse.json({ success: true, newBalance: data });
  } catch (err) {
    console.error("Award coins error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
