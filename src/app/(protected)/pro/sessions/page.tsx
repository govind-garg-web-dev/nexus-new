"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Session = {
  id: string; type: string; title: string; description: string | null;
  host_name: string; scheduled_at: string; duration_mins: number;
  max_participants: number; status: string;
  registeredCount: number; isRegistered: boolean;
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  discussion:     { icon: "🗣", color: "#3b82f6", label: "Group Discussion" },
  mock_interview: { icon: "🎤", color: "#a855f7", label: "Mock Interview" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

export default function SessionsPage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [joining, setJoining]     = useState<string | null>(null);
  const [toast, setToast]         = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res  = await fetch("/api/pro/sessions");
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const register = async (sessionId: string) => {
    setJoining(sessionId);
    const res = await fetch(`/api/pro/sessions/${sessionId}/register`, { method: "POST" });
    setJoining(null);
    if (res.ok) { load(); showToast("Registered! You'll receive the session link 30 minutes before."); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👑</span>
            <span className="font-pixel text-xs text-amber-400 tracking-widest">PRO</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl mb-1">Group Sessions</h1>
          <p className="font-tech text-sm text-white/40">Weekly live discussions + mock interviews with peers</p>
        </div>
        <Link href="/pro" className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Pro Home</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-4">📅</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No sessions scheduled yet</p>
          <p className="font-tech text-sm text-white/40">Weekly sessions are being scheduled. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s, i) => {
            const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.discussion;
            const { date, time } = formatDate(s.scheduled_at);
            const spotsLeft = s.max_participants - s.registeredCount;

            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl border p-6"
                style={{ background: `${cfg.color}06`, borderColor: `${cfg.color}25` }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}>
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-tech text-xs px-2 py-0.5 rounded" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                        {cfg.label}
                      </span>
                      {s.status === "live" && (
                        <span className="flex items-center gap-1 font-pixel text-[10px] text-emerald-400 tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE NOW
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-white text-lg mb-1">{s.title}</h3>
                    {s.description && <p className="font-tech text-sm text-white/60 mb-3 leading-relaxed">{s.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                      <span className="font-tech text-white/60">📅 {date}</span>
                      <span className="font-tech text-white/60">⏰ {time}</span>
                      <span className="font-tech text-white/60">⏱ {s.duration_mins} min</span>
                      <span className="font-tech text-white/60">👥 {s.registeredCount}/{s.max_participants}</span>
                      {spotsLeft <= 5 && spotsLeft > 0 && (
                        <span className="font-tech text-amber-400">Only {spotsLeft} spots left!</span>
                      )}
                      {spotsLeft === 0 && <span className="font-tech text-red-400">Full</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="font-tech text-xs text-white/30">Hosted by {s.host_name}</p>
                      <div className="ml-auto">
                        {s.isRegistered ? (
                          <span className="flex items-center gap-2 font-tech text-sm text-emerald-400">
                            ✓ Registered
                          </span>
                        ) : (
                          <button onClick={() => register(s.id)} disabled={joining === s.id || spotsLeft === 0}
                            className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                            {joining === s.id ? "…" : "Register →"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {toast && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl max-w-sm text-center"
          style={{ backdropFilter: "blur(12px)" }}>
          <span className="font-display font-semibold text-white text-sm">{toast}</span>
        </motion.div>
      )}
    </div>
  );
}
