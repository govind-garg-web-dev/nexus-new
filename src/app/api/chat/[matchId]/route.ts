import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectCrisis, detectThreat } from "@/lib/crisis-keywords";

type Params = { params: Promise<{ matchId: string }> };

// ── GET: load message history ──────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Verify participation
    const { data: match } = await supabase
      .from("match_events")
      .select("id, user_a_id, user_b_id, status")
      .eq("id", matchId)
      .single();

    if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
    if (match.user_a_id !== user.id && match.user_b_id !== user.id)
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    if (match.status !== "revealed")
      return NextResponse.json({ error: "Chat requires identity reveal first." }, { status: 403 });

    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender_id, content, type, image_url, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .limit(200);

    return NextResponse.json({ messages: messages ?? [] });
  } catch (err) {
    console.error("Chat GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ── POST: send a text message ──────────────────────────────
export async function POST(request: Request, { params }: Params) {
  const { matchId } = await params;
  try {
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: "Message too long (max 2000 chars)." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Verify participation + revealed status
    const { data: match } = await supabase
      .from("match_events")
      .select("id, user_a_id, user_b_id, status")
      .eq("id", matchId)
      .single();

    if (!match || (match.user_a_id !== user.id && match.user_b_id !== user.id))
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    if (match.status !== "revealed")
      return NextResponse.json({ error: "Chat requires identity reveal first." }, { status: 403 });

    // Check if either user has blocked the other
    const otherId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
    const { data: blockExists } = await supabase
      .from("blocks")
      .select("id")
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (blockExists) return NextResponse.json({ error: "This conversation is blocked." }, { status: 403 });

    // Detect crisis / threats server-side
    const hasCrisis = detectCrisis(content);
    const threatKw  = detectThreat(content);
    const flagged   = !!threatKw;
    const flagReason = threatKw ? `threat:${threatKw}` : undefined;

    const admin = createAdminClient();

    // Insert message
    const { data: message, error: msgErr } = await admin
      .from("messages")
      .insert({
        match_id:    matchId,
        sender_id:   user.id,
        content:     content.trim(),
        type:        "text",
        flagged,
        flag_reason: flagReason ?? null,
      })
      .select("id, sender_id, content, type, image_url, created_at")
      .single();

    if (msgErr) throw msgErr;

    // Add to mod queue if flagged
    if (flagged && message) {
      await admin.from("mod_queue").insert({
        message_id:  message.id,
        flag_reason: flagReason!,
      });
    }

    return NextResponse.json({ message, hasCrisis });
  } catch (err) {
    console.error("Chat POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
