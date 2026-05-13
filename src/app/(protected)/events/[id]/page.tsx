"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type Event = { id: string; title: string; description: string; type: string; organizer: string | null; deadline: string | null; link: string | null; };
type Lobby = {
  id: string; looking_for: string; team_size: number; slots_needed: number;
  badge_filter: string | null; locked: boolean; replies: number;
  isMyPost: boolean; hasApplied: boolean;
  poster: { pseudonym: string; avatar_color: string; reliability_score: number } | null;
  badges: { category: string; difficulty: number }[];
};

const BADGE_OPTIONS = ["", "coding", "writing", "design", "quiz"];
const CATEGORY_COLOR: Record<string, string> = { coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981" };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent]   = useState<Event | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ lookingFor: "", teamSize: 1, slotsNeeded: 1, badgeFilter: "" });
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying]   = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const [evRes, lobRes] = await Promise.all([
      fetch(`/api/events?q=`).then((r) => r.json()), // simplified — fetch from list
      fetch(`/api/events/${id}/lobby`).then((r) => r.json()),
    ]);
    // Find this event in the list (or separately fetch if needed)
    setLobbies(lobRes.lobbies ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // Fetch event detail
    fetch("/api/events").then((r) => r.json()).then((d) => {
      const found = (d.events ?? []).find((e: Event) => e.id === id);
      setEvent(found ?? null);
    });
    load();
  }, [id, load]);

  const postLobby = async () => {
    if (!form.lookingFor.trim()) return;
    setSubmitting(true);
    const res  = await fetch(`/api/events/${id}/lobby`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setForm({ lookingFor: "", teamSize: 1, slotsNeeded: 1, badgeFilter: "" });
    load();
    showToast("Your lobby post is live!");
  };

  const apply = async (lobbyId: string) => {
    setApplying(lobbyId);
    const res  = await fetch(`/api/events/${id}/lobby/${lobbyId}/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: applyNote }),
    });
    const data = await res.json();
    setApplying(null);
    setApplyTarget(null);
    setApplyNote("");
    if (!res.ok) { setError(data.error); return; }
    load();
    showToast("Application sent!");
  };

  const lockTeam = async (lobbyId: string) => {
    await fetch(`/api/events/${id}/lobby/${lobbyId}/lock`, { method: "POST" });
    load();
    showToast("Team locked! Ghosting now costs −15 reliability.");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      {/* Event info */}
      {event && (
        <div className="rounded-2xl border border-white/10 p-6 mb-8" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-tech text-xs text-white/40 mb-1">{event.organizer}</p>
              <h1 className="font-display font-bold text-white text-2xl mb-2">{event.title}</h1>
              <p className="font-tech text-sm text-white/60 leading-relaxed">{event.description}</p>
              {event.deadline && (
                <p className="font-tech text-sm text-amber-400 mt-3">
                  ⏰ Deadline: {new Date(event.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            {event.link && (
              <a href={event.link} target="_blank" rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 rounded-xl border border-white/10 font-tech text-sm text-violet-400 hover:text-violet-300 transition-colors"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                Register ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Lobby header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-white text-xl">Team Formation Lobby</h2>
          <p className="font-tech text-sm text-white/40">{lobbies.length} posts · Apply with your verified badges</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Post My Stack
        </button>
      </div>

      {/* Create lobby form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">What are you looking for?</p>
            <textarea value={form.lookingFor} onChange={(e) => setForm({ ...form, lookingFor: e.target.value })}
              placeholder="e.g. Backend dev (Python/Django), looking for 1 frontend + 1 ML. Idea: rural healthcare app."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-3"
              style={{ background: "rgba(255,255,255,0.03)" }} />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="font-tech text-xs text-white/40 block mb-1">Your team size</label>
                <input type="number" min={1} max={8} value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-transparent" />
              </div>
              <div>
                <label className="font-tech text-xs text-white/40 block mb-1">Slots needed</label>
                <input type="number" min={1} max={5} value={form.slotsNeeded}
                  onChange={(e) => setForm({ ...form, slotsNeeded: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-transparent" />
              </div>
              <div>
                <label className="font-tech text-xs text-white/40 block mb-1">Badge required</label>
                <select value={form.badgeFilter} onChange={(e) => setForm({ ...form, badgeFilter: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm bg-[#0d0d1a] focus:outline-none">
                  {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{b || "Any"}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="font-tech text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
              <button onClick={postLobby} disabled={!form.lookingFor.trim() || submitting}
                className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                {submitting ? "Posting…" : "Post →"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lobby list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : lobbies.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No posts yet</p>
          <p className="font-tech text-sm text-white/40">Be the first to post what skills you have and what you need.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lobbies.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-5 ${l.locked ? "border-emerald-500/20" : "border-white/8"}`}
              style={{ background: l.locked ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-4">
                {/* Poster avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-base text-white shrink-0"
                  style={{ backgroundColor: l.poster?.avatar_color ?? "#7c3aed" }}>
                  {l.poster?.pseudonym[0].toUpperCase() ?? "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-display font-semibold text-white text-sm">{l.poster?.pseudonym}</span>
                    <span className="font-tech text-xs text-white/40">· Score {l.poster?.reliability_score}</span>
                    {l.locked && <span className="font-pixel text-[10px] text-emerald-400 tracking-widest">TEAM LOCKED</span>}
                    {l.isMyPost && <span className="font-pixel text-[10px] text-violet-400 tracking-widest">YOUR POST</span>}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {l.badges.map((b, j) => (
                      <span key={j} className="font-tech text-xs px-2 py-0.5 rounded"
                        style={{ color: CATEGORY_COLOR[b.category] ?? "#a855f7", background: `${CATEGORY_COLOR[b.category] ?? "#a855f7"}12`, border: `1px solid ${CATEGORY_COLOR[b.category] ?? "#a855f7"}25` }}>
                        {b.category} L{b.difficulty}
                      </span>
                    ))}
                  </div>

                  <p className="font-tech text-sm text-white/70 leading-relaxed mb-3">{l.looking_for}</p>

                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="font-tech text-white/40">Team: {l.team_size} · Need: {l.slots_needed} more</span>
                    {l.badge_filter && (
                      <span className="font-tech text-white/40">Requires: {l.badge_filter} badge</span>
                    )}
                    <span className="font-tech text-white/30">{l.replies} applicant{l.replies !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!l.isMyPost && !l.locked && !l.hasApplied && (
                    <button onClick={() => setApplyTarget(l.id)}
                      className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                      Apply →
                    </button>
                  )}
                  {!l.isMyPost && l.hasApplied && (
                    <span className="font-tech text-xs text-emerald-400 px-3 py-2">Applied ✓</span>
                  )}
                  {l.isMyPost && !l.locked && (
                    <button onClick={() => lockTeam(l.id)}
                      className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-display font-semibold text-sm hover:bg-emerald-500/15 transition-colors">
                      Lock Team
                    </button>
                  )}
                </div>
              </div>

              {/* Apply note input */}
              {applyTarget === l.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-white/8">
                  <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)}
                    placeholder="Brief note: your role, what you'll bring to the team…"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-2"
                    style={{ background: "rgba(255,255,255,0.03)" }} />
                  <div className="flex gap-2">
                    <button onClick={() => setApplyTarget(null)} className="flex-1 py-2 rounded-lg font-tech text-xs text-white/40 border border-white/10 hover:text-white">Cancel</button>
                    <button onClick={() => apply(l.id)} disabled={applying === l.id}
                      className="flex-1 py-2 rounded-lg btn-primary text-white font-display font-semibold text-xs disabled:opacity-40">
                      {applying === l.id ? "…" : "Send Application"}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl"
            style={{ backdropFilter: "blur(12px)" }}>
            <span className="text-emerald-400">✓</span>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
