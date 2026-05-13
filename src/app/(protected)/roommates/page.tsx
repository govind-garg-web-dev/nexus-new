"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Match = {
  userId:       string;
  score:        number;
  incompatible: boolean;
  summary:      string;
  diffs:        string[];
  lookingFor:   string | null;
  budgetMax:    number | null;
  bio:          string | null;
  profile: {
    pseudonym:         string;
    avatar_color:      string;
    reliability_score: number;
    college:           string;
    branch:            string | null;
    batch_year:        number | null;
  } | null;
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct  = score / 100;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-white text-sm">{score}%</span>
      </div>
    </div>
  );
}

export default function RoommatesPage() {
  const router  = useRouter();
  const [matches, setMatches]   = useState<Match[]>([]);
  const [noProfile, setNoProfile] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"matches" | "pg">("matches");

  useEffect(() => {
    fetch("/api/roommates/feed")
      .then((r) => r.json())
      .then((d) => {
        setNoProfile(d.noProfile ?? false);
        setMatches(d.matches ?? []);
        setLoading(false);
      });
  }, []);

  const connectWithRoommate = async (userId: string) => {
    // Create a match_event with intent='roommate' via the feed like endpoint
    const res  = await fetch("/api/feed/like", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ targetId: userId, intent: "roommate" }),
    });
    const data = await res.json();
    if (data.mutual) {
      router.push(`/feed/icebreaker/${data.matchId}`);
    } else {
      alert("Interest sent! If they feel the same, you'll both be notified to connect.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Housing</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Find a <span className="font-script italic gradient-text">Roommate</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Compatibility-matched · Lifestyle quiz · Anonymous until you connect
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/roommates/pg"
            className="px-4 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/50 hover:text-white hover:border-white/20 transition-all"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            PG Listings
          </Link>
          <Link href="/roommates/quiz"
            className="px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
            {noProfile ? "Take Quiz" : "Retake Quiz"}
          </Link>
        </div>
      </div>

      {/* No profile CTA */}
      {noProfile && !loading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-violet-500/20 p-10 text-center mb-8"
          style={{ background: "rgba(124,58,237,0.06)" }}>
          <div className="text-5xl mb-4">🏠</div>
          <h2 className="font-display font-bold text-white text-2xl mb-3">
            Take the 12-question lifestyle quiz
          </h2>
          <p className="font-tech text-sm text-white/50 leading-relaxed max-w-sm mx-auto mb-6">
            2 minutes. We match you with people who have compatible living habits — sleep schedule, cleanliness, study environment, and more.
          </p>
          <Link href="/roommates/quiz"
            className="inline-flex px-8 py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg">
            Start the Quiz →
          </Link>
        </motion.div>
      )}

      {/* Matches */}
      {!noProfile && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-display font-semibold text-white/60 text-xl mb-2">No matches on your campus yet</p>
              <p className="font-tech text-sm text-white/40">
                Be patient — as more students take the quiz, your matches appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-tech text-sm text-white/50 mb-4">
                {matches.filter((m) => !m.incompatible).length} compatible · {matches.filter((m) => m.incompatible).length} incompatible
              </p>
              {matches.map((m, i) => (
                <motion.div key={m.userId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border p-5 flex items-start gap-4 ${
                    m.incompatible ? "border-red-500/15 opacity-60" : "border-white/8"
                  }`}
                  style={{ background: m.incompatible ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.02)" }}>

                  {/* Score ring or X */}
                  {m.incompatible ? (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-red-500/20" style={{ background: "rgba(239,68,68,0.08)" }}>
                      ✕
                    </div>
                  ) : (
                    <ScoreRing score={m.score} />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: m.profile?.avatar_color ?? "#7c3aed" }}>
                        {m.profile?.pseudonym[0].toUpperCase() ?? "?"}
                      </div>
                      <p className="font-display font-bold text-white text-sm">{m.profile?.pseudonym}</p>
                      <p className="font-tech text-xs text-white/40">· Score {m.profile?.reliability_score}</p>
                    </div>

                    <p className="font-tech text-xs text-white/40 mb-2">
                      {m.profile?.branch} · {m.profile?.batch_year}
                    </p>

                    {/* Compatibility summary */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-2 ${
                      m.incompatible ? "bg-red-500/10 border border-red-500/20" : "bg-white/4 border border-white/8"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.incompatible ? "bg-red-400" : m.score >= 80 ? "bg-emerald-400" : m.score >= 60 ? "bg-amber-400" : "bg-orange-400"}`} />
                      <span className={`font-tech text-xs ${m.incompatible ? "text-red-300" : "text-white/60"}`}>
                        {m.incompatible ? "INCOMPATIBLE — " : ""}{m.summary}
                      </span>
                    </div>

                    {m.bio && <p className="font-tech text-xs text-white/50 line-clamp-2 mb-2">"{m.bio}"</p>}

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {m.lookingFor && m.lookingFor !== "any" && (
                        <span className="font-tech text-white/30">Looking for: {m.lookingFor}</span>
                      )}
                      {m.budgetMax && (
                        <span className="font-tech text-white/30">Budget: ≤₹{m.budgetMax.toLocaleString()}/mo</span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  {!m.incompatible && (
                    <button onClick={() => connectWithRoommate(m.userId)}
                      className="shrink-0 px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                      Connect →
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
