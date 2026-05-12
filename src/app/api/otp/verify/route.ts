import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const authkey = process.env.MSG91_AUTH_KEY!;
    const mobile  = `91${phone}`;

    // authkey in both header and query param for reliability
    const url = `https://control.msg91.com/api/v5/otp/verify?authkey=${authkey}&mobile=${mobile}&otp=${otp}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        authkey,
        accept: "application/json",
      },
    });

    let result: Record<string, unknown> = {};
    try { result = await res.json(); } catch { /* non-JSON response */ }

    console.log("[OTP verify] MSG91 response:", res.status, result);

    if (result.type !== "success") {
      const msg91Error = (result.message as string) ?? "Incorrect OTP";
      console.error("[OTP verify] MSG91 error:", msg91Error);
      return NextResponse.json(
        { error: msg91Error.includes("expired") ? "OTP has expired. Please request a new one." : "Incorrect OTP. Please try again." },
        { status: 400 }
      );
    }

    await supabase
      .from("users")
      .update({ phone, phone_verified: true })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OTP verify] exception:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
