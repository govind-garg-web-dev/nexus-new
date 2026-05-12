"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string; subject: string; status: string; timer_ends_at: string | null;
  phase: number; host_id: string; pomodoro_mins: number; break_mins: number;
  jitsi_room_id: string;
};

function PomodoroTimer({ room, isHost, onStart }: { room: Room; isHost: boolean; onStart: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!room.timer_ends_at) { setRemaining(room.pomodoro_mins * 60); return; }
    const update = () => {
      const diff = Math.max(0, new Date(room.timer_ends_at!).getTime() - Date.now());
      setRemaining(Math.floor(diff / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [room.timer_ends_at, room.pomodoro_mins]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const total  = room.status === "break" ? room.break_mins * 60 : room.pomodoro_mins * 60;
  const pct    = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const color  = room.status === "pomodoro" ? "#a855f7" : "#06b6d4";
  const r      = 54;
  const circ   = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative mb-4">
        <svg width={128} height={128} viewBox="0 0 128 128">
          <circle cx={64} cy={64} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          <circle cx={64} cy={64} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={circ - (pct / 100) * circ}
            transform="rotate(-90 64 64)"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dashoffset 0.9s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-white text-2xl">
            {m}:{String(s).padStart(2, "0")}
          </span>
          <span className="font-tech text-xs" style={{ color }}>
            {room.status === "waiting" ? "READY" : room.status === "pomodoro" ? "FOCUS" : "BREAK"}
          </span>
        </div>
      </div>

      {room.status === "waiting" && <p className="font-tech text-sm text-white/40 mb-4">Waiting for host to start</p>}
      {room.status === "break" && <p className="font-tech text-sm text-white/60 mb-4">Take a break — you earned it ☕</p>}

      {isHost && (
        <button onClick={onStart}
          className="px-6 py-3 rounded-2xl btn-primary text-white font-display font-bold text-base">
          {room.status === "waiting" ? "▶ Start Pomodoro" :
           room.status === "pomodoro" ? "⏸ End & Take Break" :
           "▶ Start Next Pomodoro"}
        </button>
      )}

      <div className="flex gap-6 mt-6 text-center">
        <div>
          <p className="font-display font-bold text-white text-2xl">{room.phase}</p>
          <p className="font-tech text-xs text-white/40">Rounds</p>
        </div>
        <div>
          <p className="font-display font-bold text-white text-2xl">{room.pomodoro_mins}</p>
          <p className="font-tech text-xs text-white/40">Min focus</p>
        </div>
        <div>
          <p className="font-display font-bold text-white text-2xl">{room.break_mins}</p>
          <p className="font-tech text-xs text-white/40">Min break</p>
        </div>
      </div>
    </div>
  );
}

export default function StudyRoomPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [room, setRoom]       = useState<Room | null>(null);
  const [myId, setMyId]       = useState<string | null>(null);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from("study_rooms").select("*").eq("id", id).single();
    setRoom(data);
    const { data: mems } = await supabase.from("study_room_members").select("user_id").eq("room_id", id);
    setMembers(mems ?? []);
  }, [id]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // Realtime subscription for timer sync
  useEffect(() => {
    const channel = supabase.channel(`room-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "study_rooms", filter: `id=eq.${id}` },
        (payload) => setRoom(payload.new as Room))
      .on("postgres_changes", { event: "*", schema: "public", table: "study_room_members", filter: `room_id=eq.${id}` },
        () => loadRoom())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadRoom]);

  const startTimer = async () => {
    await fetch(`/api/study-rooms/${id}/start`, { method: "POST" });
  };

  const leave = async () => {
    await supabase.from("study_room_members").delete().eq("room_id", id).eq("user_id", myId!);
    router.push("/study-rooms");
  };

  if (!room) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const isHost = myId === room.host_id;

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button onClick={leave} className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Leave</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-white text-lg">{room.subject}</h1>
          <p className="font-tech text-xs text-white/40">{members.length} studying · {isHost ? "You are the host" : "Guest"}</p>
        </div>
      </div>

      {/* Main layout: timer left, Jitsi right */}
      <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0">
        {/* Pomodoro timer */}
        <div className="rounded-2xl border border-white/10 overflow-hidden flex flex-col" style={{ background: "rgba(255,255,255,0.02)" }}>
          <PomodoroTimer room={room} isHost={isHost} onStart={startTimer} />
          <div className="px-6 pb-6 text-center">
            <p className="font-tech text-xs text-white/30 leading-relaxed">
              {room.status === "pomodoro"
                ? "Deep focus mode. No joining mid-session."
                : "Joining is open during waiting and break phases."}
            </p>
          </div>
        </div>

        {/* Jitsi audio room */}
        <div className="rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/8 shrink-0">
            <p className="font-tech text-xs text-white/50">🎙 Audio Room (Jitsi — no account needed)</p>
          </div>
          <iframe
            src={`https://meet.jit.si/nexus-study-${room.jitsi_room_id}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.toolbarButtons=["microphone","hangup"]`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="flex-1 w-full border-0"
            style={{ minHeight: 300 }}
          />
        </div>
      </div>
    </div>
  );
}
