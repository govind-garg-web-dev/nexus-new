"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type MatchData = {
  id:                 string;
  status:             string;
  intent:             string;
  icebreakerQuestion: string;
  myAnswer:           string | null;
  theirAnswered:      boolean;
  createdAt:          string;
  revealedAt:         string | null;
  other: {
    id:               string;
    pseudonym:        string;
    avatar_color:     string;
    reliability_score: number;
    badges: Array<{ category: string; difficulty: number }>;
  };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; action: string; href: (id: string) => string }> = {
  mutual: {
    label: "Waiting for icebreaker",
    color: "#f59e0b",
    action: "Send Icebreaker →",
    href: (id) => `/feed/icebreaker/${id}`,
  },
  icebreaker_sent: {
    label: "Icebreaker sent",
    color: "#3b82f6",
    action: "View / Answer →",
    href: (id) => `/feed/icebreaker/${id}`,
  },
  icebreaker_completed: {
    label: "Both answered — ready to reveal!",
    color: "#a855f7",
    action: "Reveal Identities 🎉",
    href: (id) => `/feed/reveal/${id}`,
  },
  revealed: {
    label: "Identities revealed",
    color: "#10b981",
    action: "Open Chat 💬",
    href: (id) => `/chat/${id}`,
  },
};

const CATEGORY_COLOR: Record<string, string> = {
  coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => { setMatches(d.matches ?? []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/feed" className="font-pixel text-white/40 hover:text-white transition-colors text-lg">←</Link>
        <div>
          <h1 className="font-display font-bold text-white text-3xl">Your Matches</h1>
          <p className="font-tech text-sm text-white/40">
            {matches.length} {matches.length === 1 ? "match" : "matches"} total
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="text-5xl mb-4">✦</div>
          <h2 className="font-display font-bold text-white text-xl mb-2">No matches yet</h2>
          <p className="font-tech text-sm text-white/40 mb-6">
            Head back to the feed and swipe on profiles you want to connect with.
          </p>
          <Link href="/feed" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
            Back to Feed →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m, i) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.mutual;
            const scoreColor =
              m.other.reliability_score >= 80 ? "#10b981" :
              m.other.reliability_score >= 60 ? "#f59e0b" : "#ef4444";

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/10 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="p-5 flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-2xl text-white shrink-0"
                    style={{ backgroundColor: m.other.avatar_color, boxShadow: `0 0 16px ${m.other.avatar_color}50` }}
                  >
                    {m.other.pseudonym[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-white text-base">{m.other.pseudonym}</h3>
                      <span className="font-tech text-xs font-bold" style={{ color: scoreColor }}>
                        {m.other.reliability_score}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {m.other.badges.slice(0, 3).map((b, j) => {
                        const color = CATEGORY_COLOR[b.category] ?? "#a855f7";
                        return (
                          <span key={j} className="font-pixel text-[10px] px-2 py-0.5 rounded"
                            style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                            {b.category} L{b.difficulty}
                          </span>
                        );
                      })}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="font-tech text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>

                    {/* Show if they've answered when I haven't */}
                    {m.status === "icebreaker_sent" && !m.myAnswer && m.theirAnswered && (
                      <p className="font-tech text-xs text-amber-400 mt-1">
                        ⚡ They&apos;ve answered — your turn!
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <Link
                    href={cfg.href(m.id)}
                    className="shrink-0 px-4 py-2.5 rounded-xl font-display font-semibold text-sm text-white transition-all"
                    style={{
                      background: m.status === "icebreaker_completed"
                        ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                        : "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {cfg.action}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
