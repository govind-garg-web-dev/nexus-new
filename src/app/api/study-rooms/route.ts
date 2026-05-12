import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: rooms } = await supabase
      .from("study_rooms")
      .select(`id, host_id, subject, status, timer_ends_at, phase, max_members, pomodoro_mins, break_mins, jitsi_room_id, created_at,
        study_room_members(count)`)
      .neq("status", "ended")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ rooms: rooms ?? [] });
  } catch (err) {
    console.error("Study rooms GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { subject, pomodoroMins, breakMins, maxMembers } = await request.json();
    if (!subject?.trim()) return NextResponse.json({ error: "subject is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data: room } = await admin.from("study_rooms").insert({
      host_id:       user.id,
      subject:       subject.trim(),
      pomodoro_mins: pomodoroMins ?? 25,
      break_mins:    breakMins   ?? 5,
      max_members:   maxMembers  ?? 6,
    }).select("id").single();

    // Auto-join host
    await admin.from("study_room_members").insert({ room_id: room!.id, user_id: user.id });

    return NextResponse.json({ roomId: room!.id });
  } catch (err) {
    console.error("Study rooms POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
