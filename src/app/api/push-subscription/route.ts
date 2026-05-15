import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { subscription } = await request.json();
    if (!subscription?.endpoint) return NextResponse.json({ ok: true });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    await admin.from("push_subscriptions").upsert({
      user_id:      user.id,
      endpoint:     subscription.endpoint,
      p256dh:       subscription.keys?.p256dh ?? null,
      auth:         subscription.keys?.auth   ?? null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: "user_id,endpoint", ignoreDuplicates: false });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscription error:", err);
    return NextResponse.json({ ok: true }); // always ok — never break the app
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ ok: true });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
