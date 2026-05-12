"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Submission = {
  id: string;
  created_at: string;
  submitted_text: string | null;
  submitted_file_url: string | null;
  skill_challenges: { id: string; title: string; category: string; difficulty: number; description: string } | null;
};

const CATEGORY_COLOR: Record<string, string> = {
  writing: "#3b82f6", design: "#10b981",
};

export default function ReviewQueuePage() {
  const [submissions, setSubmissions]   = useState<Submission[]>([]);
  const [eligible, setEligible]         = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [message, setMessage]           = useState("");
  const [active, setActive]             = useState<Submission | null>(null);
  const [note, setNote]                 = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [done, setDone]                 = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/challenges/review")
      .then((r) => r.json())
      .then((d) => {
        setSubmissions(d.submissions ?? []);
        setEligible(d.eligibleCategories ?? []);
        setMessage(d.message ?? "");
        setLoading(false);
      });
  }, []);

  const submitReview = async (verdict: "approved" | "rejected") => {
    if (!active) return;
    setSubmitting(true);
    const res  = await fetch("/api/challenges/review", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ submissionId: active.id, verdict, note }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone((prev) => new Set([...prev, active.id]));
      setActive(null);
      setNote("");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <p className="font-tech text-sm text-white/50 mb-1">Peer Review</p>
        <h1 className="font-display font-bold text-white text-3xl mb-2">Review Queue</h1>
        <p className="font-tech text-sm text-white/50">
          Review submissions in categories where you hold a verified badge.
          Each submission needs <span className="text-white/80">2 approvals</span> for the badge to be minted.
        </p>
        {eligible.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {eligible.map((cat) => (
              <span key={cat} className="font-tech text-xs px-3 py-1 rounded-full border"
                style={{ color: CATEGORY_COLOR[cat] ?? "#a855f7", borderColor: `${CATEGORY_COLOR[cat] ?? "#a855f7"}30`, background: `${CATEGORY_COLOR[cat] ?? "#a855f7"}10` }}>
                {cat} reviewer
              </span>
            ))}
          </div>
        )}
      </div>

      {message && !submissions.length && (
        <div className="rounded-2xl p-8 border border-white/10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No submissions to review</p>
          <p className="font-tech text-sm text-white/40">{message}</p>
        </div>
      )}

      {/* Submission list */}
      <div className="space-y-3">
        {submissions.filter((s) => !done.has(s.id)).map((s) => {
          const meta  = s.skill_challenges;
          const color = CATEGORY_COLOR[meta?.category ?? ""] ?? "#a855f7";
          const mins  = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
          const timeAgo = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;

          return (
            <div key={s.id} className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-base shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                    {meta?.category === "writing" ? "W" : "D"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-white text-sm mb-0.5 truncate">{meta?.title ?? "Submission"}</p>
                    <p className="font-tech text-xs text-white/40">{meta?.category} · Level {meta?.difficulty} · submitted {timeAgo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActive(s)}
                  className="shrink-0 px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm"
                >
                  Review →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col"
              style={{ background: "#0d0d1a" }}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-tech text-xs text-white/50 mb-0.5">Reviewing</p>
                  <h2 className="font-display font-bold text-white text-lg">{active.skill_challenges?.title}</h2>
                </div>
                <button onClick={() => setActive(null)} className="font-pixel text-white/40 hover:text-white text-lg transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Content */}
                {active.submitted_text && (
                  <div className="rounded-xl p-4 border border-white/5 mb-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="font-tech text-xs text-white/50 mb-3 font-semibold tracking-wider">SUBMISSION</p>
                    <p className="font-tech text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{active.submitted_text}</p>
                  </div>
                )}

                {active.submitted_file_url && (
                  <div className="mb-5">
                    <p className="font-tech text-xs text-white/50 mb-3 font-semibold tracking-wider">SUBMITTED DESIGN</p>
                    <img src={active.submitted_file_url} alt="Submission" className="w-full rounded-xl border border-white/10" />
                  </div>
                )}

                {/* Review note */}
                <div className="mb-5">
                  <label className="font-tech text-xs text-white/50 font-semibold tracking-wider block mb-2">FEEDBACK NOTE (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Brief feedback for the author…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  />
                </div>

                {/* Rubric reminder */}
                <div className="rounded-xl p-4 border border-violet-500/15 bg-violet-500/5">
                  <p className="font-tech text-xs text-violet-300 font-semibold tracking-wider mb-2">REVIEW CRITERIA</p>
                  <p className="font-tech text-xs text-white/50 leading-relaxed">
                    {active.skill_challenges?.category === "writing"
                      ? "Clarity · Specificity · Structure · Meets the prompt requirements"
                      : "Accuracy to reference · Visual polish · Spacing & alignment · Typography"}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => submitReview("rejected")}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-display font-semibold text-sm hover:bg-red-500/15 transition-colors disabled:opacity-40"
                >
                  {submitting ? "…" : "Reject"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => submitReview("approved")}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-display font-semibold text-sm hover:bg-emerald-500/15 transition-colors disabled:opacity-40"
                >
                  {submitting ? "…" : "Approve ✓"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
