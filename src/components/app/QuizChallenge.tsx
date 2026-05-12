"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Question = { q: string; options: string[]; difficulty?: number };
type Challenge = {
  id: string; title: string; description: string;
  difficulty: number; time_limit_seconds: number;
  questions: Question[];
};
type Breakdown = { index: number; correct: boolean; explanation: string };

const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];
const TOTAL_QUESTIONS = 10;

function useTimer(limit: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = limit - elapsed;
  const over = remaining < 0;
  const m = Math.floor(Math.abs(remaining) / 60);
  const s = Math.abs(remaining) % 60;
  return { display: `${over ? "+" : ""}${m}:${String(s).padStart(2, "0")}`, over, elapsed };
}

// ── Adaptive question selector ──────────────────────────────
// If questions have per-difficulty tags, adapts dynamically.
// Falls back to sequential for non-adaptive quizzes.
function useAdaptiveQueue(questions: Question[]) {
  const isAdaptive = questions.some((q) => q.difficulty !== undefined);

  const pools = useMemo(() => {
    if (!isAdaptive) return null;
    return {
      1: questions.map((q, i) => ({ ...q, origIdx: i })).filter((q) => q.difficulty === 1),
      2: questions.map((q, i) => ({ ...q, origIdx: i })).filter((q) => q.difficulty === 2),
      3: questions.map((q, i) => ({ ...q, origIdx: i })).filter((q) => q.difficulty === 3),
    };
  }, [questions, isAdaptive]);

  const [currentDiff, setCurrentDiff]       = useState(2); // start medium
  const [shown, setShown]                   = useState<number[]>([]); // origIdx of shown questions
  const [consecutiveCorrect, setCC]         = useState(0);
  const [consecutiveWrong, setCW]           = useState(0);
  const [sequence, setSequence]             = useState<Question[]>([]);

  // Build adaptive sequence lazily: pick next question when needed
  const pickNext = (wasCorrect?: boolean) => {
    if (!isAdaptive || !pools) return null;

    let nextDiff = currentDiff;
    let cc = consecutiveCorrect;
    let cw = consecutiveWrong;

    if (wasCorrect !== undefined) {
      if (wasCorrect) {
        cc++;
        cw = 0;
        if (cc >= 2 && nextDiff < 3) { nextDiff++; cc = 0; }
      } else {
        cw++;
        cc = 0;
        if (cw >= 2 && nextDiff > 1) { nextDiff--; cw = 0; }
      }
      setCC(cc);
      setCW(cw);
      setCurrentDiff(nextDiff);
    }

    // Pick unused question at target difficulty, fallback to adjacent
    for (const d of [nextDiff, nextDiff + 1, nextDiff - 1, 1, 2, 3]) {
      if (d < 1 || d > 3) continue;
      const pool = pools[d as 1|2|3];
      const unused = pool.filter((q) => !shown.includes(q.origIdx));
      if (unused.length > 0) {
        const pick = unused[Math.floor(Math.random() * unused.length)];
        setShown((prev) => [...prev, pick.origIdx]);
        return pick as Question;
      }
    }
    return null; // exhausted
  };

  return { isAdaptive, pickNext, sequence, setSequence, shown };
}

export default function QuizChallenge({ challenge }: { challenge: Challenge }) {
  const { isAdaptive, pickNext } = useAdaptiveQueue(challenge.questions);

  // For adaptive: build the question sequence on the fly
  // For non-adaptive: use questions as-is sequentially
  const [adaptiveQueue, setAdaptiveQueue] = useState<Question[]>([]);
  const [answers, setAnswers]             = useState<(number | null)[]>(
    Array(isAdaptive ? TOTAL_QUESTIONS : challenge.questions.length).fill(null)
  );
  const [current, setCurrent]             = useState(0);
  const [submitting, setSubmitting]       = useState(false);
  const [result, setResult]               = useState<{
    passed: boolean; score: number; correct: number; total: number; breakdown: Breakdown[];
  } | null>(null);
  const { display, over, elapsed } = useTimer(challenge.time_limit_seconds);

  // Seed the first adaptive question on mount
  useEffect(() => {
    if (isAdaptive) {
      const first = pickNext();
      if (first) setAdaptiveQueue([first]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdaptive]);

  const displayQuestions = isAdaptive ? adaptiveQueue : challenge.questions;
  const totalCount       = isAdaptive ? TOTAL_QUESTIONS : challenge.questions.length;
  const q                = displayQuestions[current];
  const allAnswered      = answers.slice(0, current + 1).every((a) => a !== null) && current === totalCount - 1;
  const answeredCount    = answers.filter((a) => a !== null).length;

  const select = (optIdx: number) => {
    if (result) return;
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
  };

  const goNext = () => {
    if (current < totalCount - 1) {
      const nextIdx = current + 1;
      // If adaptive and we haven't loaded this question yet, pick it now
      if (isAdaptive && nextIdx >= adaptiveQueue.length) {
        const wasCorrect = answers[current] !== null
          ? false // we don't know correct here (correct stripped server-side)
          : undefined;
        const nextQ = pickNext(wasCorrect);
        if (nextQ) setAdaptiveQueue((prev) => [...prev, nextQ]);
      }
      setCurrent(nextIdx);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // For adaptive, send the actual question indices we used as metadata
    const res  = await fetch("/api/challenges/submit/quiz", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        challengeId:        challenge.id,
        answers:            answers.slice(0, totalCount),
        timeTakenSeconds:   elapsed,
        adaptiveQuestions:  isAdaptive ? adaptiveQueue.map((q) => q.q) : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    setResult(data);
  };

  // ── Results view ────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-8 border mb-8 text-center ${
            result.passed ? "border-emerald-500/25 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
          }`}
        >
          <div className="font-display font-bold text-5xl mb-3" style={{ color: result.passed ? "#10b981" : "#ef4444" }}>
            {result.score}%
          </div>
          <p className={`font-display font-bold text-xl mb-1 ${result.passed ? "text-emerald-300" : "text-red-300"}`}>
            {result.passed ? "Badge Earned!" : "Not quite — try again"}
          </p>
          <p className="font-tech text-sm text-white/50 mb-2">
            {result.correct} / {result.total} correct · Pass threshold: 70%
          </p>
          {isAdaptive && (
            <p className="font-tech text-xs text-violet-300">Adaptive quiz — difficulty adjusted to your performance</p>
          )}
          {result.passed && (
            <p className="font-tech text-xs text-violet-400 mt-2">◈ BADGE MINTED · RELIABILITY +3</p>
          )}
        </motion.div>

        <div className="space-y-3">
          <p className="font-display font-semibold text-white text-lg mb-4">Review</p>
          {displayQuestions.map((q, i) => {
            const bd = result.breakdown[i];
            return (
              <div key={i} className={`rounded-xl p-4 border ${bd?.correct ? "border-emerald-500/15 bg-emerald-500/3" : "border-red-500/15 bg-red-500/3"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`font-display font-bold text-lg mt-0.5 shrink-0 ${bd?.correct ? "text-emerald-400" : "text-red-400"}`}>
                    {bd?.correct ? "✓" : "✗"}
                  </span>
                  <p className="font-tech text-sm text-white leading-relaxed">{q.q}</p>
                  {q.difficulty && (
                    <span className="shrink-0 font-tech text-xs px-2 py-0.5 rounded ml-auto"
                      style={{ color: DIFF_COLOR[q.difficulty], background: `${DIFF_COLOR[q.difficulty]}15` }}>
                      L{q.difficulty}
                    </span>
                  )}
                </div>
                {q.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-2 ml-8 mb-1">
                    <span className={`font-tech text-xs w-4 ${j === answers[i] && !bd?.correct ? "text-red-400" : "text-white/30"}`}>
                      {j === answers[i] ? "→" : " "}
                    </span>
                    <span className="font-tech text-xs text-white/60">{opt}</span>
                  </div>
                ))}
                {bd?.explanation && (
                  <p className="font-tech text-xs text-violet-300 ml-8 mt-2 leading-relaxed">💡 {bd.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!q) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-tech text-xs px-2 py-0.5 rounded"
              style={{ color: DIFF_COLOR[challenge.difficulty], background: `${DIFF_COLOR[challenge.difficulty]}15`, border: `1px solid ${DIFF_COLOR[challenge.difficulty]}25` }}>
              {DIFF_LABEL[challenge.difficulty]}
            </span>
            <span className="font-tech text-xs text-white/40">{isAdaptive ? "ADAPTIVE QUIZ" : "QUIZ / DSA"}</span>
          </div>
          <h1 className="font-display font-bold text-white text-xl">{challenge.title}</h1>
        </div>
        <div className={`font-tech text-sm px-3 py-1.5 rounded-lg border shrink-0 ${
          over ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-white/50 border-white/10"
        }`}>{display}</div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mb-8 flex-wrap">
        {Array.from({ length: totalCount }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full transition-all duration-200"
            style={{
              backgroundColor: i === current ? "#a855f7" : answers[i] !== null ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)",
              boxShadow: i === current ? "0 0 6px #a855f7" : undefined,
            }} />
        ))}
        <span className="font-tech text-xs text-white/40 ml-2">
          {answeredCount} / {totalCount}
          {isAdaptive && " · adaptive"}
        </span>
      </div>

      {/* Current difficulty indicator (adaptive) */}
      {isAdaptive && q.difficulty && (
        <div className="flex items-center gap-2 mb-4">
          <span className="font-tech text-xs text-white/40">Current difficulty:</span>
          <span className="font-tech text-xs px-2 py-0.5 rounded"
            style={{ color: DIFF_COLOR[q.difficulty], background: `${DIFF_COLOR[q.difficulty]}15` }}>
            {DIFF_LABEL[q.difficulty]}
          </span>
        </div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22 }}
        >
          <div className="rounded-2xl p-6 border border-white/10 mb-5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="font-tech text-xs text-white/40 mb-3">Q{current + 1} OF {totalCount}</p>
            <p className="font-display font-semibold text-white text-base leading-relaxed">{q.q}</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => select(i)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 ${
                    selected ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 hover:border-white/20"
                  }`}
                  style={{ background: selected ? undefined : "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-violet-500 bg-violet-500" : "border-white/20"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-tech text-sm text-white/80">{opt}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center gap-3 mt-8">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
          className="px-4 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/50 hover:text-white transition-colors disabled:opacity-30"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          ← Prev
        </button>

        {current < totalCount - 1 ? (
          <button
            onClick={goNext}
            disabled={answers[current] === null}
            className="px-4 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/50 hover:text-white transition-colors ml-auto disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            Next →
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={answers[current] === null || submitting}
            className="ml-auto px-6 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Grading…" : "Submit Quiz →"}
          </motion.button>
        )}
      </div>
    </div>
  );
}
