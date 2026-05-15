"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
  submissionId:  string;
  status:        string;
  submittedText?: string;
  challengeTitle: string;
  category:      string;
  challengeId:   string;
}

export default function SubmissionStatus({
  submissionId, status: initialStatus, submittedText, challengeTitle, category, challengeId,
}: Props) {
  const [status, setStatus]       = useState(initialStatus);
  const [showBadge, setShowBadge] = useState(false);
  const supabase = createClient();

  // Realtime — watch for status change on this submission
  useEffect(() => {
    if (initialStatus === "passed") return; // already done, no need to watch

    const channel = supabase
      .channel(`submission-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "challenge_submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          setStatus(newStatus);
          if (newStatus === "passed") {
            setShowBadge(true);
            setTimeout(() => setShowBadge(false), 4000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, initialStatus]);

  const isPassed   = status === "passed";
  const isFailed   = status === "failed";
  const isReview   = status === "under_review";

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      {/* Badge earned animation */}
      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border border-violet-500/30 shadow-2xl"
            style={{ background: "rgba(124,58,237,0.15)", backdropFilter: "blur(12px)" }}
          >
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-display font-bold text-white text-sm">Badge Earned!</p>
              <p className="font-tech text-xs text-violet-300">Two reviewers approved your submission.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8">
        <Link href="/challenges" className="font-tech text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2 mb-6">
          ← Back to Challenges
        </Link>
        <h1 className="font-display font-bold text-white text-2xl mb-1">{challengeTitle}</h1>
        <p className="font-tech text-sm text-white/40 capitalize">{category} Challenge</p>
      </div>

      {/* Status card */}
      <div className={`rounded-3xl border p-8 mb-6 text-center ${
        isPassed ? "border-emerald-500/25 bg-emerald-500/5"
        : isFailed ? "border-red-500/20 bg-red-500/5"
        : "border-amber-500/20 bg-amber-500/5"
      }`}>
        {isReview && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-pixel text-xs text-amber-400 tracking-widest">LIVE</span>
            </div>
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="font-display font-bold text-white text-2xl mb-2">
              Your submission is under peer review
            </h2>
            <p className="font-tech text-sm text-white/60 leading-relaxed mb-6">
              Two verified peers must approve your response for you to earn the badge.
              This page updates automatically — no need to refresh.
            </p>
            <Link href="/challenges/review"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-300 font-display font-semibold text-sm hover:bg-amber-500/12 transition-colors">
              Help others — join the Review Queue ◇
            </Link>
          </>
        )}

        {isPassed && (
          <>
            <div className="text-5xl mb-4">🏅</div>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Badge Earned!</h2>
            <p className="font-tech text-sm text-white/60 mb-5">
              Two reviewers approved your submission. Your {category} badge is now live on your profile.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/profile"
                className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                View Badge →
              </Link>
              <Link href="/challenges"
                className="px-5 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/50 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                More Challenges
              </Link>
            </div>
          </>
        )}

        {isFailed && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-display font-bold text-white text-2xl mb-2">Not approved this time</h2>
            <p className="font-tech text-sm text-white/60 mb-5">
              Two reviewers rejected your submission. Read the feedback below and try again.
            </p>
            <Link href={`/challenges/${category}/${challengeId}`}
              className="inline-flex px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
              Try Again →
            </Link>
          </>
        )}
      </div>

      {/* Their submitted response */}
      {submittedText && (
        <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-tech text-xs text-white/40 font-semibold tracking-wider mb-3">YOUR SUBMISSION</p>
          <p className="font-tech text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{submittedText}</p>
        </div>
      )}
    </div>
  );
}
