"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type MatchInfo = {
  id: string;
  status: string;
  icebreakerQuestion: string;
  myAnswer: string | null;
  theirAnswered: boolean;
  intent: string;
  other: { pseudonym: string; avatar_color: string };
};

export default function IcebreakerPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router      = useRouter();
  const [match, setMatch]       = useState<MatchInfo | null>(null);
  const [answer, setAnswer]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.matches ?? []).find((m: { id: string }) => m.id === matchId);
        setMatch(found ?? null);
        if (found?.myAnswer) setSubmitted(true);
        setLoading(false);
      });
  }, [matchId]);

  const handleSubmit = async () => {
    if (!answer.trim() || answer.trim().length < 20) {
      setError("Please write at least 20 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res  = await fetch("/api/icebreaker/answer", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ matchId, answer }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setSubmitted(true);
    if (data.readyToReveal) {
      // Both answered — go to reveal
      setTimeout(() => router.push(`/feed/reveal/${matchId}`), 1200);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!match) return (
    <div className="text-center p-10">
      <p className="font-tech text-white/60">Match not found.</p>
    </div>
  );

  const isCoFounder = match.intent === "co_founder";

  return (
    <div className="max-w-xl mx-auto p-6 lg:p-10">
      {/* Back */}
      <button onClick={() => router.back()} className="font-tech text-sm text-white/40 hover:text-white transition-colors mb-8 flex items-center gap-2">
        ← Back to Matches
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-2xl text-white"
            style={{ backgroundColor: match.other.avatar_color, boxShadow: `0 0 20px ${match.other.avatar_color}60` }}
          >
            {match.other.pseudonym[0].toUpperCase()}
          </div>
        </div>
        <h1 className="font-display font-bold text-white text-2xl mb-1">
          {isCoFounder ? "Co-Founder Icebreaker" : "One question first."}
        </h1>
        <p className="font-tech text-sm text-white/50">
          You matched with <span className="text-white">{match.other.pseudonym}</span>.
          {isCoFounder
            ? " Answer 3 structured questions before revealing identities."
            : " Both of you answer this before your identities are revealed."}
        </p>
      </div>

      {/* Question card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/20 p-6 mb-6"
        style={{ background: "rgba(124,58,237,0.06)" }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">💬</span>
          <p className="font-display font-semibold text-white text-base leading-relaxed">
            {match.icebreakerQuestion}
          </p>
        </div>
      </motion.div>

      {/* Answer area */}
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your honest answer here — they'll see it after the reveal…"
              rows={6}
              className="w-full px-4 py-4 rounded-2xl border border-white/10 text-white placeholder-white/20 font-tech text-sm leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-2"
              style={{ background: "rgba(255,255,255,0.02)" }}
            />
            <div className="flex items-center justify-between mb-4">
              <span className={`font-tech text-xs ${answer.trim().length < 20 ? "text-white/30" : "text-white/50"}`}>
                {answer.trim().length} chars {answer.trim().length < 20 ? `(${20 - answer.trim().length} more to submit)` : ""}
              </span>
              {match.theirAnswered && (
                <span className="font-tech text-xs text-amber-400">⚡ They&apos;ve already answered!</span>
              )}
            </div>

            {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={answer.trim().length < 20 || submitting}
              className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit Answer →"}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            {match.theirAnswered ? (
              <div>
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="font-display font-bold text-white text-2xl mb-2">Both answered!</h2>
                <p className="font-tech text-sm text-white/60 mb-6">Redirecting to the reveal…</p>
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto" />
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-4">⏳</div>
                <h2 className="font-display font-bold text-white text-2xl mb-2">Answer submitted!</h2>
                <p className="font-tech text-sm text-white/60 mb-2">
                  Waiting for <span className="text-white">{match.other.pseudonym}</span> to answer.
                </p>
                <p className="font-tech text-xs text-white/30">
                  You&apos;ll both see each other&apos;s answers when they respond.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
