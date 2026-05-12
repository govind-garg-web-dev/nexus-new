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
      .select("id, host_id, status, pomodoro_mins, break_mins, phase")
      .eq("id", id)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    if (room.host_id !== user.id) return NextResponse.json({ error: "Only the host can start/stop the timer." }, { status: 403 });

    const admin = createAdminClient();

    if (room.status === "waiting" || room.status === "break") {
      // Start a Pomodoro
      const endsAt = new Date(Date.now() + room.pomodoro_mins * 60 * 1000);
      await admin.from("study_rooms").update({
        status:        "pomodoro",
        timer_ends_at: endsAt.toISOString(),
        phase:         (room.phase ?? 0) + 1,
      }).eq("id", id);
      return NextResponse.json({ status: "pomodoro", endsAt });
    }

    if (room.status === "pomodoro") {
      // End Pomodoro → start break
      const endsAt = new Date(Date.now() + room.break_mins * 60 * 1000);
      await admin.from("study_rooms").update({
        status:        "break",
        timer_ends_at: endsAt.toISOString(),
      }).eq("id", id);
      return NextResponse.json({ status: "break", endsAt });
    }

    return NextResponse.json({ error: "Nothing to start." }, { status: 400 });
  } catch (err) {
    console.error("Start room error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
