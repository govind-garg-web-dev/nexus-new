import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/block — block a user
export async function POST(request: Request) {
  try {
    const { blockedId, reason, deviceHash } = await request.json();
    if (!blockedId) return NextResponse.json({ error: "blockedId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (user.id === blockedId) return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });

    const admin = createAdminClient();

    // Get the blocked user's phone hash (for cross-account tracking)
    const { data: blockedUser } = await admin
      .from("users")
      .select("phone")
      .eq("id", blockedId)
      .maybeSingle();

    const phoneHash = blockedUser?.phone
      ? Buffer.from(blockedUser.phone).toString("base64")
      : null;

    // Insert block
    const { error } = await admin.from("blocks").upsert({
      blocker_id:  user.id,
      blocked_id:  blockedId,
      phone_hash:  phoneHash,
      device_hash: deviceHash ?? null,
      reason:      reason ?? null,
    }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });

    if (error) throw error;

    // Mark any active match as blocked
    await admin
      .from("match_events")
      .update({ status: "blocked" })
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${blockedId}),and(user_a_id.eq.${blockedId},user_b_id.eq.${user.id})`)
      .in("status", ["mutual", "icebreaker_sent", "icebreaker_completed", "revealed"]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Block error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET /api/block?userId=xxx — check if a block exists between caller and userId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: block } = await supabase
      .from("blocks")
      .select("id, blocker_id")
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`)
      .maybeSingle();

    return NextResponse.json({
      blocked:   !!block,
      iBlockedThem: block?.blocker_id === user.id,
    });
  } catch (err) {
    console.error("Block check error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
