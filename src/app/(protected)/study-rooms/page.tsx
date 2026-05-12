"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type Room = {
  id: string; subject: string; status: string; timer_ends_at: string | null;
  phase: number; max_members: number; pomodoro_mins: number; break_mins: number;
  created_at: string; study_room_members: [{ count: number }];
};

function Timer({ endsAt, status }: { endsAt: string | null; status: string }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setRemaining(Math.floor(diff / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt || status === "waiting") return <span className="font-tech text-xs text-white/30">Waiting to start</span>;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const color = status === "pomodoro" ? "#a855f7" : "#06b6d4";
  return (
    <span className="font-tech text-sm font-bold" style={{ color }}>
      {status === "pomodoro" ? "🍅" : "☕"} {m}:{String(s).padStart(2, "0")} {status === "pomodoro" ? "focus" : "break"}
    </span>
  );
}

export default function StudyRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState<string | null>(null);
  const [myId, setMyId]         = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
    });
  }, []);

  const load = async () => {
    const res = await fetch("/api/study-rooms");
    const data = await res.json();
    setRooms(data.rooms ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  const create = async () => {
    if (!subject.trim()) return;
    setCreating(true);
    const res  = await fetch("/api/study-rooms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/study-rooms/${data.roomId}`);
  };

  const join = async (roomId: string, status: string) => {
    setJoining(roomId);
    setError("");
    const res  = await fetch(`/api/study-rooms/${roomId}/join`, { method: "POST" });
    const data = await res.json();
    setJoining(null);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/study-rooms/${roomId}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Academic Vault</p>
          <h1 className="font-display font-bold text-white text-3xl mb-1">
            Pomodoro{" "}
            <span className="font-script italic gradient-text">Study Rooms</span>
          </h1>
          <p className="font-tech text-sm text-white/40">25 min focus · 5 min break · No mid-session joins · Jitsi audio</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Create Room
        </button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
          <p className="font-display font-semibold text-white text-sm mb-3">New Study Room</p>
          <div className="flex gap-3">
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Subject or topic (e.g. DBMS Revision, OS Exam prep)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
            <button onClick={create} disabled={!subject.trim() || creating}
              className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
              {creating ? "…" : "Create"}
            </button>
          </div>
        </motion.div>
      )}

      {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-4">🍅</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No active rooms</p>
          <p className="font-tech text-sm text-white/40">Create a room and invite others to focus together.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room, i) => {
            const memberCount = room.study_room_members?.[0]?.count ?? 0;
            // Host can always rejoin their own room, even during a Pomodoro
            const isMyRoom = (room as unknown as { host_id?: string }).host_id === myId;
            const canJoin  = isMyRoom || (room.status !== "pomodoro" && memberCount < room.max_members);
            return (
              <motion.div key={room.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/8 p-5 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-3xl shrink-0">{room.status === "pomodoro" ? "🍅" : room.status === "break" ? "☕" : "📚"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-white text-base mb-1">{room.subject}</p>
                  <div className="flex items-center gap-3">
                    <Timer endsAt={room.timer_ends_at} status={room.status} />
                    <span className="font-tech text-xs text-white/30">
                      {memberCount}/{room.max_members} studying
                    </span>
                    {room.phase > 0 && <span className="font-tech text-xs text-white/30">Phase {room.phase}</span>}
                  </div>
                </div>
                <button
                  onClick={() => join(room.id, room.status)}
                  disabled={joining === room.id || !canJoin}
                  className={`shrink-0 px-4 py-2.5 rounded-xl font-display font-semibold text-sm transition-all ${
                    canJoin
                      ? "btn-primary text-white"
                      : "border border-white/10 text-white/30 cursor-not-allowed"
                  }`}
                  style={{ background: canJoin ? undefined : "rgba(255,255,255,0.02)" }}
                  title={!canJoin && room.status === "pomodoro" ? "Wait for the break to join" : ""}
                >
                  {joining === room.id ? "…" : isMyRoom ? "Open →" : canJoin ? "Join →" : room.status === "pomodoro" ? "Wait for break" : "Full"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
