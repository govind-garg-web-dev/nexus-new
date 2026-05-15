"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type Entry = {
  userId: string; pseudonym: string; avatarColor: string;
  reliabilityScore: number; badgeCount: number; currentStreak: number;
  longestStreak: number; vaultKarma: number; score: number; isMe: boolean;
};

const MEDAL = ["🥇","🥈","🥉"];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [college, setCollege]         = useState("");
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { setLeaderboard(d.leaderboard ?? []); setCollege(d.college ?? ""); setLoading(false); });
  }, []);

  const myRank = leaderboard.findIndex((e) => e.isMe) + 1;

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <p className="font-tech text-sm text-white/50 mb-1">Community</p>
        <h1 className="font-display font-bold text-white text-4xl mb-1">
          Campus <span className="font-script italic gradient-text">Leaderboard</span>
        </h1>
        <p className="font-tech text-sm text-white/40">{college} · Ranked by badges × reliability × streak × karma</p>
      </div>

      {/* My rank highlight */}
      {myRank > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/6 p-4 mb-6 flex items-center gap-3">
          <span className="font-display font-black text-violet-400 text-2xl">#{myRank}</span>
          <div>
            <p className="font-display font-bold text-white text-sm">Your rank</p>
            <p className="font-tech text-xs text-white/50">
              Score: {leaderboard.find((e) => e.isMe)?.score ?? 0} · Keep completing challenges to climb!
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No rankings yet</p>
          <p className="font-tech text-sm text-white/40">Complete challenges to appear on the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            return (
              <motion.div key={entry.userId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  entry.isMe ? "border-violet-500/25" : "border-white/8"
                }`}
                style={{ background: entry.isMe ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)" }}>

                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {rank <= 3 ? (
                    <span className="text-xl">{MEDAL[rank-1]}</span>
                  ) : (
                    <span className="font-display font-bold text-white/40 text-sm">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-lg text-white shrink-0"
                  style={{ backgroundColor: entry.avatarColor, boxShadow: entry.isMe ? `0 0 14px ${entry.avatarColor}60` : "none" }}>
                  {entry.pseudonym[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-white text-sm truncate">{entry.pseudonym}</p>
                    {entry.isMe && <span className="font-pixel text-[10px] text-violet-400 tracking-wider shrink-0">YOU</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-tech text-xs text-white/40">
                      {entry.badgeCount} badge{entry.badgeCount !== 1 ? "s" : ""}
                    </span>
                    {entry.currentStreak > 0 && (
                      <span className="font-tech text-xs text-amber-400">🔥 {entry.currentStreak}</span>
                    )}
                    <span className="font-tech text-xs text-white/30">Score {entry.reliabilityScore}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-white text-lg">{entry.score}</p>
                  <p className="font-tech text-[10px] text-white/30">pts</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl p-4 border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="font-tech text-xs text-white/40 leading-relaxed text-center">
          Score = Badges×15 + Reliability + Karma×0.5 + Streak×5 · Refreshes daily
        </p>
      </div>
    </div>
  );
}
