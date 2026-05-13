import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; lobbyId: string }> };

// Locking the team means everyone accepted is committed.
// Any ghost after this point = -15 reliability score.
export async function POST(_req: Request, { params }: Params) {
  const { lobbyId } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: lobby } = await supabase
      .from("event_lobbies").select("id, user_id, locked").eq("id", lobbyId).single();
    if (!lobby) return NextResponse.json({ error: "Lobby not found." }, { status: 404 });
    if (lobby.user_id !== user.id) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    if (lobby.locked) return NextResponse.json({ error: "Already locked." }, { status: 400 });

    const admin = createAdminClient();
    await admin.from("event_lobbies").update({
      locked: true, locked_at: new Date().toISOString(),
    }).eq("id", lobbyId);

    return NextResponse.json({ success: true, message: "Team locked. Ghosting after this point costs −15 reliability." });
  } catch (err) {
    console.error("Lock error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
