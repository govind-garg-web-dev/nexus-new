"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type DailyChallenge = {
  id: string; title: string; category: string; difficulty: number;
  description: string; time_limit_seconds: number; completedToday: boolean;
};
type Streak = { current_streak: number; longest_streak: number; total_completions: number; last_completed_at: string | null; };

const CATEGORY_COLOR: Record<string, string> = { coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981" };
const CATEGORY_ICON:  Record<string, string> = { coding: "◈", writing: "◎", quiz: "◆", design: "❋" };
const DIFF_LABEL = ["", "Level 1", "Level 2", "Level 3"];
const DIFF_COLOR = ["", "#10b981", "#f59e0b", "#ef4444"];

const STREAK_BADGES = [
  { at: 5,  label: "5-Day Streak", icon: "🔥", color: "#f59e0b" },
  { at: 10, label: "10-Day Streak", icon: "⚡", color: "#a855f7" },
  { at: 30, label: "30-Day Streak", icon: "💎", color: "#06b6d4" },
];

export default function DailyPage() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [streak, setStreak]         = useState<Streak | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch("/api/daily-challenges")
      .then((r) => r.json())
      .then((d) => {
        setChallenges(d.dailyChallenges ?? []);
        setStreak(d.streak);
        setLoading(false);
      });
  }, []);

  const nextBadge = STREAK_BADGES.find((b) => b.at > (streak?.current_streak ?? 0));
  const daysToNext = nextBadge ? nextBadge.at - (streak?.current_streak ?? 0) : 0;

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <p className="font-tech text-sm text-white/50 mb-1">Community</p>
        <h1 className="font-display font-bold text-white text-4xl mb-1">
          Daily <span className="font-script italic gradient-text">Challenges</span>
        </h1>
        <p className="font-tech text-sm text-white/40">One challenge per day · Build a streak · Climb the leaderboard</p>
      </div>

      {/* Streak card */}
      {streak !== null && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/20 p-6 mb-8 flex items-center gap-6"
          style={{ background: "rgba(245,158,11,0.06)" }}>
          <div className="text-center shrink-0">
            <p className="font-display font-black text-white text-5xl">{streak.current_streak}</p>
            <p className="font-tech text-xs text-amber-400 tracking-wider">DAY STREAK</p>
          </div>
          <div className="h-12 w-px bg-white/10 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="text-center">
                <p className="font-display font-bold text-white text-xl">{streak.longest_streak}</p>
                <p className="font-tech text-xs text-white/40">Best</p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-white text-xl">{streak.total_completions}</p>
                <p className="font-tech text-xs text-white/40">Total</p>
              </div>
            </div>
            {nextBadge && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min(100, ((streak.current_streak % nextBadge.at) / nextBadge.at) * 100)}%` }} />
                </div>
                <span className="font-tech text-xs text-amber-400 shrink-0">
                  {daysToNext}d to {nextBadge.icon}
                </span>
              </div>
            )}
          </div>
          <Link href="/leaderboard"
            className="shrink-0 px-4 py-2 rounded-xl border border-amber-500/25 font-tech text-sm text-amber-400 hover:text-amber-300 hover:border-amber-500/40 transition-all"
            style={{ background: "rgba(245,158,11,0.08)" }}>
            Leaderboard →
          </Link>
        </motion.div>
      )}

      {/* Daily challenges */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">📅</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No daily challenges set yet</p>
          <p className="font-tech text-sm text-white/40">The admin will assign daily challenges. Meanwhile, try any challenge to build your streak.</p>
          <Link href="/challenges" className="inline-flex mt-5 px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm">
            Browse All Challenges →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((c, i) => {
            const color = CATEGORY_COLOR[c.category] ?? "#a855f7";
            const href  = `/challenges/${c.category === "quiz" ? "quiz" : c.category}/${c.id}`;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`rounded-2xl border p-5 ${c.completedToday ? "border-emerald-500/25 opacity-70" : "border-white/8"}`}
                style={{ background: c.completedToday ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    {c.completedToday ? "✅" : CATEGORY_ICON[c.category] ?? "◈"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-pixel text-[10px] tracking-widest px-2 py-0.5 rounded"
                        style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}>
                        DAILY {c.category.toUpperCase()}
                      </span>
                      <span className="font-tech text-xs px-2 py-0.5 rounded"
                        style={{ color: DIFF_COLOR[c.difficulty], background: `${DIFF_COLOR[c.difficulty]}12` }}>
                        {DIFF_LABEL[c.difficulty]}
                      </span>
                      <span className="font-tech text-xs text-white/30">{Math.round(c.time_limit_seconds / 60)} min</span>
                    </div>
                    <h3 className="font-display font-bold text-white text-lg mb-1">{c.title}</h3>
                    <p className="font-tech text-sm text-white/50 line-clamp-2">
                      {c.description.replace(/[`*#]/g, "").slice(0, 120)}…
                    </p>
                  </div>
                  <div className="shrink-0">
                    {c.completedToday ? (
                      <span className="font-tech text-sm text-emerald-400">Done ✓</span>
                    ) : (
                      <Link href={href}
                        className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm whitespace-nowrap">
                        Start →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Streak badges info */}
      <div className="mt-10 rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="font-tech text-sm font-semibold text-white/50 mb-4 tracking-wider">STREAK BADGES</p>
        <div className="grid grid-cols-3 gap-3">
          {STREAK_BADGES.map((b) => {
            const earned = (streak?.longest_streak ?? 0) >= b.at;
            return (
              <div key={b.at} className={`rounded-xl p-3 text-center border ${earned ? "border-amber-500/25" : "border-white/5"}`}
                style={{ background: earned ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.01)", opacity: earned ? 1 : 0.5 }}>
                <p className="text-2xl mb-1">{b.icon}</p>
                <p className="font-display font-bold text-white text-sm">{b.label}</p>
                <p className="font-tech text-xs text-white/30">{b.at} days</p>
                {earned && <p className="font-pixel text-[10px] text-amber-400 mt-1 tracking-widest">EARNED</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
