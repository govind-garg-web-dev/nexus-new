export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Called after Razorpay payment succeeds on the client
export async function POST(request: Request) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = await request.json();

    // Verify signature
    const secret  = process.env.RAZORPAY_KEY_SECRET!;
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const amountPaise = plan === "yearly" ? 599900 : 99900;
    const admin = createAdminClient();

    // Record subscription
    await admin.from("subscriptions").insert({
      user_id:             user.id,
      plan,
      status:              "active",
      amount_paise:        amountPaise,
      razorpay_order_id:   razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      starts_at:           now.toISOString(),
      expires_at:          expiresAt.toISOString(),
    });

    // Update user pro status
    await admin.from("users").update({
      pro_expires_at: expiresAt.toISOString(),
      pro_plan:       plan,
    }).eq("id", user.id);

    return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
