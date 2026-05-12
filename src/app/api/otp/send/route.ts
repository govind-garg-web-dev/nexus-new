import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const authkey    = process.env.MSG91_AUTH_KEY!;
    const templateId = process.env.MSG91_TEMPLATE_ID!;
    const mobile     = `91${phone}`;

    // Pass authkey in both header and query param — MSG91 v5 accepts both
    const url = `https://control.msg91.com/api/v5/otp?authkey=${authkey}&template_id=${templateId}&mobile=${mobile}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey,
        "Content-Type": "application/json",
        accept:         "application/json",
      },
      // Minimal body — sender is set on the template in MSG91 dashboard
      body: JSON.stringify({ template_id: templateId, mobile }),
    });

    let result: Record<string, unknown> = {};
    try { result = await res.json(); } catch { /* non-JSON response */ }

    console.log("[OTP send] MSG91 response:", res.status, result);

    if (result.type === "error" || (!res.ok && result.type !== "success")) {
      const msg91Error = (result.message as string) ?? "Unknown MSG91 error";
      console.error("[OTP send] MSG91 error:", msg91Error);
      return NextResponse.json(
        { error: `SMS failed: ${msg91Error}` },
        { status: 500 }
      );
    }

    // Store phone (unverified) against user
    await supabase
      .from("users")
      .update({ phone, phone_verified: false })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OTP send] exception:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
