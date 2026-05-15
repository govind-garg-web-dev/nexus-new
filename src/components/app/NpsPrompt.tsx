"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NPS_KEY     = "nexus_nps_completed";
const NPS_SHOWN   = "nexus_nps_last_shown";
const TRIGGER_DAYS = 3;    // show after 3 days
const REPEAT_DAYS  = 30;   // don't show again for 30 days

export default function NpsPrompt({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [score, setScore]     = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [phase, setPhase]     = useState<"rating" | "comment" | "done">("rating");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(NPS_KEY);
    if (completed) return;

    const lastShown = localStorage.getItem(NPS_SHOWN);
    if (lastShown) {
      const daysSince = (Date.now() - parseInt(lastShown)) / 86400000;
      if (daysSince < REPEAT_DAYS) return;
    }

    // Check account age — only show to users who've been around a bit
    const accountCreated = localStorage.getItem("nexus_created_at");
    if (accountCreated) {
      const daysSinceCreation = (Date.now() - parseInt(accountCreated)) / 86400000;
      if (daysSinceCreation < TRIGGER_DAYS) return;
    }

    // Show after 5 seconds
    const timer = setTimeout(() => {
      setVisible(true);
      localStorage.setItem(NPS_SHOWN, String(Date.now()));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(NPS_SHOWN, String(Date.now()));
  };

  const submitScore = async () => {
    if (score === null) return;
    if (phase === "rating") { setPhase("comment"); return; }

    setSubmitting(true);
    await fetch("/api/nps", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ score, comment: comment.trim() || null, userId }),
    }).catch(() => {});
    setSubmitting(false);
    setPhase("done");
    localStorage.setItem(NPS_KEY, "true");
    setTimeout(() => setVisible(false), 2500);
  };

  const scoreColor = (s: number) =>
    s >= 9 ? "#10b981" : s >= 7 ? "#f59e0b" : "#ef4444";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "#0d0d1a", backdropFilter: "blur(24px)" }}
        >
          {phase === "done" ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2">🙏</div>
              <p className="font-display font-bold text-white text-base">Thank you!</p>
              <p className="font-tech text-xs text-white/50 mt-1">Your feedback helps shape Nexus.</p>
            </div>
          ) : (
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-display font-bold text-white text-sm">Quick question</p>
                  <p className="font-tech text-xs text-white/50 mt-0.5">
                    {phase === "rating"
                      ? "How likely are you to recommend Nexus to a friend at your campus?"
                      : "Anything specific you'd like to share?"}
                  </p>
                </div>
                <button onClick={dismiss} className="font-pixel text-white/30 hover:text-white transition-colors ml-3 shrink-0">✕</button>
              </div>

              {phase === "rating" && (
                <>
                  {/* Score grid 0–10 */}
                  <div className="grid grid-cols-11 gap-1 mb-3">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setScore(i)}
                        className="aspect-square rounded-lg font-tech text-xs font-bold transition-all"
                        style={{
                          background:  score === i ? scoreColor(i) : "rgba(255,255,255,0.06)",
                          color:       score === i ? "#fff" : "rgba(255,255,255,0.5)",
                          transform:   score === i ? "scale(1.15)" : "scale(1)",
                          borderColor: score === i ? scoreColor(i) : "transparent",
                          border:      "1px solid",
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="font-tech text-[10px] text-white/30">Not at all</span>
                    <span className="font-tech text-[10px] text-white/30">Definitely!</span>
                  </div>
                </>
              )}

              {phase === "comment" && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What's working well? What could be better? (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-xs resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-4"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              )}

              <div className="flex gap-2">
                {phase === "comment" && (
                  <button onClick={() => setPhase("rating")} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-xs text-white/40 hover:text-white">Back</button>
                )}
                <button
                  onClick={submitScore}
                  disabled={(phase === "rating" && score === null) || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "…" : phase === "rating" ? "Next →" : "Submit"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
