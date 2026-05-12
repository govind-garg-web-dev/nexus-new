import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: room } = await supabase
      .from("study_rooms")
      .select("id, host_id, status, max_members, study_room_members(count)")
      .eq("id", id)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    if (room.status === "ended") return NextResponse.json({ error: "This room has ended." }, { status: 400 });

    // No mid-session join during a Pomodoro — EXCEPT for the host
    // (host may have closed the tab and needs to get back in)
    if (room.status === "pomodoro" && room.host_id !== user.id) {
      return NextResponse.json({
        error: "A Pomodoro is in progress. You can join during the next break.",
        canJoinAt: "next_break",
      }, { status: 400 });
    }

    const memberCount = (room.study_room_members as unknown as [{ count: number }])[0]?.count ?? 0;
    if (memberCount >= room.max_members) {
      return NextResponse.json({ error: "Room is full." }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from("study_room_members").upsert(
      { room_id: id, user_id: user.id },
      { onConflict: "room_id,user_id", ignoreDuplicates: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Join room error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
