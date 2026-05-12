import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP are required." }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const mobile = `91${phone}`;

    const res = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?mobile=${mobile}&otp=${otp}`,
      {
        method: "GET",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY!,
          accept: "application/json",
        },
      }
    );

    const result = await res.json();

    if (!res.ok || result.type !== "success") {
      return NextResponse.json(
        { error: "Incorrect OTP. Please try again." },
        { status: 400 }
      );
    }

    // Mark phone as verified
    await supabase
      .from("users")
      .update({ phone, phone_verified: true })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
