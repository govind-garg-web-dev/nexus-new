"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string; subject: string; status: string; timer_ends_at: string | null;
  phase: number; host_id: string; pomodoro_mins: number; break_mins: number;
  jitsi_room_id: string;
};

// ── Pomodoro timer ring ─────────────────────────────────────
function PomodoroTimer({
  room, isHost, onStart,
}: { room: Room; isHost: boolean; onStart: () => void }) {
  const [remaining, setRemaining] = useState(
    room.timer_ends_at
      ? Math.max(0, Math.floor((new Date(room.timer_ends_at).getTime() - Date.now()) / 1000))
      : room.pomodoro_mins * 60
  );

  useEffect(() => {
    const base = room.timer_ends_at
      ? Math.max(0, Math.floor((new Date(room.timer_ends_at).getTime() - Date.now()) / 1000))
      : room.pomodoro_mins * 60;
    setRemaining(base);

    if (!room.timer_ends_at) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [room.timer_ends_at, room.pomodoro_mins]);

  const m     = Math.floor(remaining / 60);
  const s     = remaining % 60;
  const total = room.status === "break"
    ? room.break_mins * 60
    : room.pomodoro_mins * 60;
  const pct   = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
  const color = room.status === "pomodoro" ? "#a855f7" : room.status === "break" ? "#06b6d4" : "#ffffff30";
  const R     = 54;
  const circ  = 2 * Math.PI * R;

  const statusLabel = room.status === "pomodoro" ? "FOCUS"
    : room.status === "break" ? "BREAK"
    : "READY";

  const btnLabel = room.status === "waiting"  ? "▶  Start Pomodoro"
    : room.status === "pomodoro" ? "⏸  End Focus → Take Break"
    : "▶  Start Next Pomodoro";

  return (
    <div className="flex flex-col items-center py-10 px-6 flex-1">
      {/* Ring */}
      <div className="relative mb-6">
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle cx={80} cy={80} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          <circle
            cx={80} cy={80} r={R} fill="none"
            stroke={color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            transform="rotate(-90 80 80)"
            style={{ filter: room.status !== "waiting" ? `drop-shadow(0 0 10px ${color})` : "none", transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-white text-3xl leading-none">
            {m}:{String(s).padStart(2, "0")}
          </span>
          <span className="font-tech text-xs mt-1" style={{ color }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Status message */}
      <p className="font-tech text-sm text-white/40 mb-6 text-center">
        {room.status === "waiting"  && "Ready when you are."}
        {room.status === "pomodoro" && "Deep focus — stay off distractions."}
        {room.status === "break"    && "Take a break — you earned it ☕"}
      </p>

      {/* Host control — always shown to host */}
      {isHost ? (
        <button
          onClick={onStart}
          className="w-full px-6 py-3.5 rounded-2xl btn-primary text-white font-display font-bold text-base mb-4"
        >
          {btnLabel}
        </button>
      ) : (
        <div className="px-4 py-2.5 rounded-xl border border-white/8 mb-4 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-tech text-sm text-white/30">
            {room.status === "pomodoro" ? "Host controls the timer" : "Waiting for host to start"}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex gap-8 text-center mt-2">
        {[
          { val: room.phase,         label: "Rounds" },
          { val: room.pomodoro_mins, label: "Min focus" },
          { val: room.break_mins,    label: "Min break" },
        ].map(({ val, label }) => (
          <div key={label}>
            <p className="font-display font-bold text-white text-2xl">{val}</p>
            <p className="font-tech text-xs text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Audio room panel (Jitsi via new tab) ────────────────────
function AudioPanel({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://meet.jit.si/nexus-study-${roomId}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 flex flex-col overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="px-5 py-3.5 border-b border-white/8 shrink-0">
        <p className="font-tech text-xs text-white/50">🎙 Audio Room</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
          🎙
        </div>

        <h3 className="font-display font-bold text-white text-xl mb-2">
          Jitsi Audio Room
        </h3>
        <p className="font-tech text-sm text-white/50 leading-relaxed mb-6 max-w-xs">
          Opens in a new tab. No account needed — the first person to join becomes the host automatically.
        </p>

        {/* Room link display */}
        <div className="w-full px-4 py-2.5 rounded-xl border border-white/8 mb-4 text-left"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="font-tech text-xs text-white/30 mb-0.5">Room link</p>
          <p className="font-tech text-xs text-white/60 truncate">{url}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 rounded-xl btn-primary text-white font-display font-bold text-sm text-center"
          >
            Open Audio Room ↗
          </a>
          <button
            onClick={copy}
            className="px-4 py-3 rounded-xl border border-white/10 font-tech text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            {copied ? "✓ Copied" : "Copy Link"}
          </button>
        </div>

        <p className="font-tech text-xs text-white/20 mt-4">
          Share the link with your study group to invite them.
        </p>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function StudyRoomPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();

  const [room, setRoom]       = useState<Room | null>(null);
  const [myId, setMyId]       = useState<string | null>(null);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoom = useCallback(async () => {
    const [{ data: roomData }, { data: mems }] = await Promise.all([
      supabase.from("study_rooms").select("*").eq("id", id).single(),
      supabase.from("study_room_members").select("user_id").eq("room_id", id),
    ]);
    setRoom(roomData);
    setMembers(mems ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // Realtime — sync timer across all participants
  useEffect(() => {
    const channel = supabase
      .channel(`room-${id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public",
        table: "study_rooms", filter: `id=eq.${id}`,
      }, (payload) => setRoom(payload.new as Room))
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "study_room_members", filter: `room_id=eq.${id}`,
      }, () => loadRoom())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadRoom]);

  const startTimer = () => {
    if (!room) return;

    // Optimistic update — instant visual feedback
    const isPomodoro = room.status === "waiting" || room.status === "break";
    const mins       = isPomodoro ? room.pomodoro_mins : room.break_mins;
    const endsAt     = new Date(Date.now() + mins * 60 * 1000).toISOString();

    setRoom((prev) => prev ? {
      ...prev,
      status:        isPomodoro ? "pomodoro" : "break",
      timer_ends_at: endsAt,
      phase:         isPomodoro ? (prev.phase ?? 0) + 1 : prev.phase,
    } : prev);

    fetch(`/api/study-rooms/${id}/start`, { method: "POST" })
      .catch(() => loadRoom()); // revert on error
  };

  const leave = async () => {
    if (myId) {
      await supabase.from("study_room_members")
        .delete().eq("room_id", id).eq("user_id", myId);
    }
    router.push("/study-rooms");
  };

  if (!room) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const isHost = myId === room.host_id;

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button
          onClick={leave}
          className="font-tech text-sm text-white/40 hover:text-white transition-colors"
        >
          ← Leave
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-white text-lg truncate">{room.subject}</h1>
          <p className="font-tech text-xs text-white/40">
            {members.length} {members.length === 1 ? "person" : "people"} studying
            {isHost ? " · You are the host" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0"
          style={{
            borderColor: room.status === "pomodoro" ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)",
            background:  room.status === "pomodoro" ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.02)",
          }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: room.status === "pomodoro" ? "#a855f7"
                : room.status === "break" ? "#06b6d4"
                : "rgba(255,255,255,0.2)",
              animation: room.status !== "waiting" ? "pulse-dot 2s ease-in-out infinite" : "none",
            }} />
          <span className="font-tech text-xs"
            style={{ color: room.status === "pomodoro" ? "#a855f7" : room.status === "break" ? "#06b6d4" : "rgba(255,255,255,0.3)" }}>
            {room.status === "pomodoro" ? "FOCUS" : room.status === "break" ? "BREAK" : "WAITING"}
          </span>
        </div>
      </div>

      {/* Two panels */}
      <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Pomodoro */}
        <div className="rounded-2xl border border-white/10 flex flex-col overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <PomodoroTimer room={room} isHost={isHost} onStart={startTimer} />
        </div>

        {/* Right: Audio room */}
        <AudioPanel roomId={room.jitsi_room_id} />
      </div>
    </div>
  );
}
