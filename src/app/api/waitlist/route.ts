import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { phone, source } = await request.json();

    // Validate: 10-digit Indian mobile starting with 6–9
    const clean = String(phone ?? "").replace(/\D/g, "").replace(/^91/, "").trim();
    if (!/^[6-9]\d{9}$/.test(clean)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian WhatsApp number." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.from("waitlist").upsert(
      { phone: clean, source: source ?? "hero" },
      { onConflict: "phone", ignoreDuplicates: true }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
