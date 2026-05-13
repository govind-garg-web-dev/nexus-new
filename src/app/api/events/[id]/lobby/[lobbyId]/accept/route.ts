import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; lobbyId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { lobbyId } = await params;
  try {
    const { applicantId } = await request.json();
    if (!applicantId) return NextResponse.json({ error: "applicantId required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: lobby } = await supabase
      .from("event_lobbies").select("id, user_id").eq("id", lobbyId).single();
    if (!lobby || lobby.user_id !== user.id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("lobby_replies")
      .update({ status: "accepted" })
      .eq("lobby_id", lobbyId).eq("applicant_id", applicantId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Accept error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
