"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string; subject: string; status: string; timer_ends_at: string | null;
  phase: number; host_id: string; pomodoro_mins: number; break_mins: number;
};

// ── Request notification permission once ────────────────────
function useNotifications() {
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };
}

// ── Pomodoro timer ──────────────────────────────────────────
function PomodoroTimer({
  room, isHost, onStart, onAutoTransition,
}: {
  room: Room;
  isHost: boolean;
  onStart: () => void;
  onAutoTransition: () => void;
}) {
  const notify   = useNotifications();
  const firedRef = useRef(false); // prevent double-fire

  const calcRemaining = useCallback(() => {
    if (!room.timer_ends_at) return room.pomodoro_mins * 60;
    return Math.max(0, Math.floor((new Date(room.timer_ends_at).getTime() - Date.now()) / 1000));
  }, [room.timer_ends_at, room.pomodoro_mins]);

  const [remaining, setRemaining] = useState(calcRemaining);

  // Reset when timer_ends_at changes
  useEffect(() => {
    firedRef.current = false;
    setRemaining(calcRemaining());
    if (!room.timer_ends_at) return;

    const id = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [room.timer_ends_at, calcRemaining]);

  // Auto-transition + notification when timer hits 0
  useEffect(() => {
    if (remaining > 0 || firedRef.current) return;
    if (room.status !== "pomodoro" && room.status !== "break") return;

    firedRef.current = true;

    if (room.status === "pomodoro") {
      notify("🍅 Pomodoro done!", `${room.pomodoro_mins} min focus complete. Break time!`);
    } else {
      notify("☕ Break over!", "Time to focus again. Start the next Pomodoro.");
    }

    // Only the host triggers the DB transition to avoid race conditions
    if (isHost) {
      onAutoTransition();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, room.status, isHost]);

  const m     = Math.floor(remaining / 60);
  const s     = remaining % 60;
  const total = room.status === "break" ? room.break_mins * 60 : room.pomodoro_mins * 60;
  const pct   = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
  const color = room.status === "pomodoro" ? "#a855f7"
    : room.status === "break"    ? "#06b6d4"
    : "rgba(255,255,255,0.15)";

  const R    = 80;
  const circ = 2 * Math.PI * R;

  const statusLabel = room.status === "pomodoro" ? "FOCUS"
    : room.status === "break" ? "BREAK"
    : "READY";

  const btnLabel = room.status === "waiting"  ? "▶  Start Pomodoro"
    : room.status === "pomodoro" ? "⏸  End Focus → Take Break"
    : "▶  Start Next Pomodoro";

  const statusColor = room.status === "pomodoro" ? "#a855f7"
    : room.status === "break" ? "#06b6d4"
    : "rgba(255,255,255,0.2)";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 flex-1">

      {/* Big ring timer */}
      <div className="relative mb-8">
        <svg width={220} height={220} viewBox="0 0 220 220">
          {/* Track */}
          <circle cx={110} cy={110} r={R} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
          {/* Progress */}
          <circle cx={110} cy={110} r={R} fill="none"
            stroke={color} strokeWidth={14} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            transform="rotate(-90 110 110)"
            style={{
              filter: room.status !== "waiting" ? `drop-shadow(0 0 14px ${color})` : "none",
              transition: "stroke-dashoffset 1s linear, stroke 0.6s ease",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-white leading-none"
            style={{ fontSize: "clamp(2.5rem, 6vw, 3.5rem)" }}>
            {m}:{String(s).padStart(2, "0")}
          </span>
          <span className="font-pixel text-sm tracking-widest mt-2" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Status message */}
      <p className="font-tech text-base text-white/50 mb-8 text-center">
        {room.status === "waiting"  && "Ready when you are."}
        {room.status === "pomodoro" && "Stay in flow. Deep focus."}
        {room.status === "break"    && "Take a proper break — away from the screen ☕"}
      </p>

      {/* Host control */}
      {isHost ? (
        <button
          onClick={onStart}
          className="px-10 py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg mb-6"
        >
          {btnLabel}
        </button>
      ) : (
        <div className="px-6 py-3.5 rounded-2xl border border-white/8 mb-6 text-center"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-tech text-sm text-white/40">
            {room.status === "waiting"  && "Waiting for host to start"}
            {room.status === "pomodoro" && "Host controls the timer"}
            {room.status === "break"    && "Break ends automatically"}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-12 text-center">
        {[
          { val: room.phase,         label: "Rounds" },
          { val: room.pomodoro_mins, label: "Min focus" },
          { val: room.break_mins,    label: "Min break" },
        ].map(({ val, label }) => (
          <div key={label}>
            <p className="font-display font-bold text-white text-3xl">{val}</p>
            <p className="font-tech text-sm text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Auto note */}
      {room.status !== "waiting" && (
        <p className="font-tech text-xs text-white/20 mt-8">
          Transitions happen automatically at the end of each phase.
        </p>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function StudyRoomPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
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

  // Realtime — sync timer state across all participants
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

  // Shared timer trigger — optimistic update + background API call
  const triggerTimer = useCallback((isOptimistic = false) => {
    if (!room) return;
    const isPomodoro = room.status === "waiting" || room.status === "break";
    const mins       = isPomodoro ? room.pomodoro_mins : room.break_mins;
    const endsAt     = new Date(Date.now() + mins * 60 * 1000).toISOString();

    if (isOptimistic) {
      setRoom((prev) => prev ? {
        ...prev,
        status:        isPomodoro ? "pomodoro" : "break",
        timer_ends_at: endsAt,
        phase:         isPomodoro ? (prev.phase ?? 0) + 1 : prev.phase,
      } : prev);
    }

    fetch(`/api/study-rooms/${id}/start`, { method: "POST" })
      .catch(() => loadRoom());
  }, [room, id, loadRoom]);

  const onStart           = () => triggerTimer(true);   // manual — optimistic
  const onAutoTransition  = () => triggerTimer(false);  // auto — let Realtime update UI

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
    <div className="max-w-2xl mx-auto p-6 lg:p-10 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <button onClick={leave}
          className="font-tech text-sm text-white/40 hover:text-white transition-colors">
          ← Leave
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-white text-xl truncate">{room.subject}</h1>
          <p className="font-tech text-xs text-white/40">
            {members.length} {members.length === 1 ? "person" : "people"} studying
            {isHost ? " · You are the host" : ""}
          </p>
        </div>
        {/* Live status chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0"
          style={{
            borderColor: room.status === "pomodoro" ? "rgba(168,85,247,0.35)"
              : room.status === "break" ? "rgba(6,182,212,0.35)"
              : "rgba(255,255,255,0.08)",
            background: room.status === "pomodoro" ? "rgba(168,85,247,0.08)"
              : room.status === "break" ? "rgba(6,182,212,0.08)"
              : "rgba(255,255,255,0.02)",
          }}>
          <div className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: room.status === "pomodoro" ? "#a855f7"
                : room.status === "break" ? "#06b6d4"
                : "rgba(255,255,255,0.2)",
              animation: room.status !== "waiting" ? "pulse-dot 2s ease-in-out infinite" : "none",
            }} />
          <span className="font-pixel text-xs tracking-wider"
            style={{
              color: room.status === "pomodoro" ? "#a855f7"
                : room.status === "break" ? "#06b6d4"
                : "rgba(255,255,255,0.3)",
            }}>
            {room.status === "pomodoro" ? "FOCUS" : room.status === "break" ? "BREAK" : "WAITING"}
          </span>
        </div>
      </div>

      {/* Timer — full width, centered */}
      <div className="flex-1 rounded-3xl border border-white/10 flex flex-col overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <PomodoroTimer
          room={room}
          isHost={isHost}
          onStart={onStart}
          onAutoTransition={onAutoTransition}
        />
      </div>

      {/* Notification hint */}
      <p className="font-tech text-xs text-white/20 text-center mt-4">
        Allow notifications to get an alert when your Pomodoro ends.
      </p>
    </div>
  );
}
