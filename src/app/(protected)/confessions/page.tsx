"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HELPLINES } from "@/lib/crisis-keywords";

type Confession = { id: string; content: string; upvotes: number; downvotes: number; myVote: number; created_at: string; };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function ConfessionsPage() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading]         = useState(true);
  const [content, setContent]         = useState("");
  const [posting, setPosting]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [toast, setToast]             = useState("");
  const [showHelpline, setShowHelpline] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res  = await fetch("/api/confessions");
    const data = await res.json();
    setConfessions(data.confessions ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const post = async () => {
    if (content.trim().length < 10) return;
    setPosting(true);
    const res  = await fetch("/api/confessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setPosting(false);
    if (!res.ok) { showToast(data.error); return; }
    setContent("");
    setShowForm(false);
    if (data.hasCrisis) setShowHelpline(true);
    if (data.status === "pending") showToast("Posted — under review by moderators.");
    else { showToast("Posted anonymously."); load(); }
  };

  const vote = (confessionId: string, v: number, current: number) => {
    const newVote = current === v ? 0 : v;
    setConfessions((prev) =>
      prev.map((c) => {
        if (c.id !== confessionId) return c;
        let { upvotes, downvotes } = c;
        if (current === 1)  upvotes   = Math.max(0, upvotes - 1);
        if (current === -1) downvotes = Math.max(0, downvotes - 1);
        if (newVote === 1)  upvotes++;
        if (newVote === -1) downvotes++;
        return { ...c, upvotes, downvotes, myVote: newVote };
      })
    );
    fetch(`/api/confessions/${confessionId}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: newVote }),
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Community</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Campus <span className="font-script italic gradient-text">Confessions</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Anonymous · College-scoped · UUID retained, never shown
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Confess
        </button>
      </div>

      {/* Compose */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-tech text-xs text-white/40 mb-3">
              Completely anonymous. Your name, pseudonym, and college are never shown. UUID stored for safety only.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              placeholder="Something on your mind that you can't say with your name on it…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
            <div className="flex items-center justify-between mb-3">
              <span className={`font-tech text-xs ${content.length > 900 ? "text-amber-400" : "text-white/30"}`}>
                {content.length}/1000
              </span>
              <span className="font-tech text-xs text-white/20">Toxicity pre-screened · Flagged posts go to mod review</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setContent(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
              <button onClick={post} disabled={content.trim().length < 10 || posting}
                className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                {posting ? "Posting…" : "Post Anonymously →"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : confessions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">💬</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">Nothing yet</p>
          <p className="font-tech text-sm text-white/40">Be the first to post.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {confessions.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="font-tech text-sm text-white/80 leading-relaxed mb-4 whitespace-pre-wrap">{c.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => vote(c.id, 1, c.myVote)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-tech text-xs transition-all ${
                      c.myVote === 1 ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/25" : "text-white/30 hover:text-emerald-400"
                    }`}>
                    ▲ {c.upvotes}
                  </button>
                  <button onClick={() => vote(c.id, -1, c.myVote)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-tech text-xs transition-all ${
                      c.myVote === -1 ? "text-red-400 bg-red-500/15 border border-red-500/25" : "text-white/30 hover:text-red-400"
                    }`}>
                    ▼ {c.downvotes}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-pixel text-[10px] text-white/20 tracking-widest">CAMPUS ANONYMOUS</span>
                  <span className="font-tech text-xs text-white/20">{timeAgo(c.created_at)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Helpline overlay (crisis detection) */}
      <AnimatePresence>
        {showHelpline && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-amber-500/20 overflow-hidden"
              style={{ background: "#0d0d1a" }}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💛</span>
                  <div>
                    <p className="font-display font-bold text-white">We noticed something in your post.</p>
                    <p className="font-tech text-xs text-white/50">Your post went through. This is just a check-in.</p>
                  </div>
                </div>
                <p className="font-tech text-sm text-white/60 leading-relaxed mb-5">
                  If what you wrote reflects something you&apos;re going through, you don&apos;t have to face it alone. These are free and confidential.
                </p>
                <div className="space-y-2 mb-5">
                  {HELPLINES.map((h) => (
                    <a key={h.name} href={`tel:${h.number.replace(/-/g, "")}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-white/8 hover:border-white/15 transition-colors"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div>
                        <p className="font-display font-semibold text-white text-sm">{h.name}</p>
                        <p className="font-tech text-xs text-white/40">{h.hours}</p>
                      </div>
                      <p className="font-tech text-sm text-violet-400">{h.number}</p>
                    </a>
                  ))}
                </div>
                <button onClick={() => setShowHelpline(false)}
                  className="w-full py-3 rounded-2xl btn-primary text-white font-display font-bold">
                  I&apos;m okay — close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-white/10 shadow-2xl"
            style={{ backdropFilter: "blur(12px)", background: "rgba(13,13,26,0.9)" }}>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
