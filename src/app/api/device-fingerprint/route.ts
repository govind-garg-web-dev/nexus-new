import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { fingerprint, userAgent } = await request.json();
    if (!fingerprint) return NextResponse.json({ ok: true }); // Silent — never block on this

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true });

    const admin = createAdminClient();

    // Store fingerprint (upsert — one record per user+fingerprint pair)
    await admin.from("device_fingerprints").upsert({
      user_id:    user.id,
      fingerprint,
      user_agent: userAgent ?? null,
    }, { onConflict: "user_id,fingerprint", ignoreDuplicates: true });

    // Check if any other user has the same fingerprint (multi-account detection)
    const { data: others } = await admin
      .from("device_fingerprints")
      .select("user_id")
      .eq("fingerprint", fingerprint)
      .neq("user_id", user.id)
      .limit(5);

    if (others && others.length > 0) {
      // Flag in mod queue for manual review — do NOT auto-ban (too many false positives)
      const otherIds = others.map((o) => o.user_id);
      console.warn(`[Device fingerprint] Multi-account detected: ${user.id} shares fingerprint with ${otherIds.join(", ")}`);
      // Future: insert into a multi_account_flags table for moderator review
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never break the app over fingerprinting failures
    console.error("Device fingerprint error:", err);
    return NextResponse.json({ ok: true });
  }
}
