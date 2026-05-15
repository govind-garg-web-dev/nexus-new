import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectCrisis, detectThreat } from "@/lib/crisis-keywords";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: messages } = await supabase
      .from("circle_messages")
      .select("id, content, created_at, sender_id")
      .eq("circle_id", id)
      .eq("flagged", false)
      .order("created_at", { ascending: true })
      .limit(100);

    // Anonymise: assign stable "Member N" labels within this batch
    // Same sender_id → same member number, but number not tied to real identity
    const senderOrder: string[] = [];
    const anon = (messages ?? []).map((m) => {
      if (!senderOrder.includes(m.sender_id)) senderOrder.push(m.sender_id);
      const memberNum = senderOrder.indexOf(m.sender_id) + 1;
      return {
        id:         m.id,
        content:    m.content,
        created_at: m.created_at,
        isMe:       m.sender_id === user.id,
        memberLabel: m.sender_id === user.id ? "You" : `Member ${memberNum}`,
      };
    });

    return NextResponse.json({ messages: anon });
  } catch (err) {
    console.error("Circle messages GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { content } = await request.json();
    if (!content?.trim() || content.length > 500) {
      return NextResponse.json({ error: "Message must be 1–500 characters." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const hasCrisis = detectCrisis(content);
    const threatKw  = detectThreat(content);
    const flagged   = !!threatKw;

    const admin = createAdminClient();
    const { data: msg } = await admin.from("circle_messages").insert({
      circle_id:  id,
      sender_id:  user.id,
      content:    content.trim(),
      flagged,
    }).select("id, content, created_at").single();

    return NextResponse.json({ message: msg, hasCrisis });
  } catch (err) {
    console.error("Circle message POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
