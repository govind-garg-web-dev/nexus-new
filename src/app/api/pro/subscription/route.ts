import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users")
      .select("pro_expires_at, pro_plan")
      .eq("id", user.id)
      .single();

    const isPro = !!(userData?.pro_expires_at && new Date(userData.pro_expires_at) > new Date());

    return NextResponse.json({
      isPro,
      plan:      userData?.pro_plan ?? null,
      expiresAt: userData?.pro_expires_at ?? null,
    });
  } catch (err) {
    console.error("Subscription GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — create a Razorpay order (skeleton, add RAZORPAY_KEY_ID to env)
export async function POST(request: Request) {
  try {
    const { plan } = await request.json();
    if (!["monthly", "yearly"].includes(plan))
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const amountPaise = plan === "yearly" ? 599900 : 99900; // ₹5999 or ₹999

    // --- Razorpay integration ---
    // Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local to activate
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method:  "POST",
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:   amountPaise,
          currency: "INR",
          receipt:  `pro_${user.id.slice(0, 8)}_${Date.now()}`,
          notes:    { userId: user.id, plan },
        }),
      });
      const order = await orderRes.json();
      return NextResponse.json({
        orderId:   order.id,
        amount:    amountPaise,
        currency:  "INR",
        keyId:     process.env.RAZORPAY_KEY_ID,
        plan,
      });
    }

    // Razorpay not configured — return a manual payment request
    return NextResponse.json({
      manual: true,
      plan,
      amount: amountPaise / 100,
      message: "Payment gateway not configured yet. Contact admin to activate your Pro subscription.",
    });
  } catch (err) {
    console.error("Subscription POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
