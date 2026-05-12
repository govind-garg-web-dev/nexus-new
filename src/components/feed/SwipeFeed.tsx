"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileCard, { type FeedProfile } from "./ProfileCard";
import FilterPanel, { type FeedFilters } from "./FilterPanel";
import MatchModal from "./MatchModal";
import Link from "next/link";

interface MyProfile {
  pseudonym:    string;
  avatar_color: string;
}

interface Match {
  matchId:      string;
  theirProfile: FeedProfile;
}

export default function SwipeFeed({ myProfile }: { myProfile: MyProfile }) {
  const [profiles, setProfiles]     = useState<FeedProfile[]>([]);
  const [index, setIndex]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [exhausted, setExhausted]   = useState(false);
  const [match, setMatch]           = useState<Match | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [likeAnim, setLikeAnim]     = useState(false);
  const [skipAnim, setSkipAnim]     = useState(false);
  const [filters, setFilters]       = useState<FeedFilters>({
    intent: "", skill: "", branch: "", year: "",
  });

  const loadProfiles = useCallback(async (f: FeedFilters, page = 0) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.intent) params.set("intent", f.intent);
    if (f.skill)  params.set("skill",  f.skill);
    if (f.branch) params.set("branch", f.branch);
    if (f.year)   params.set("year",   f.year);
    params.set("page", String(page));

    const res  = await fetch(`/api/feed?${params}`);
    const data = await res.json();

    if (page === 0) {
      setProfiles(data.profiles ?? []);
      setIndex(0);
      setExhausted((data.profiles ?? []).length === 0);
    } else {
      setProfiles((prev) => [...prev, ...(data.profiles ?? [])]);
      if ((data.profiles ?? []).length === 0) setExhausted(true);
    }
    setLoading(false);
  }, []);

  // Load match count on mount
  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatchCount((d.matches ?? []).filter((m: { status: string }) => m.status === "mutual").length));
  }, []);

  useEffect(() => { loadProfiles(filters, 0); }, [filters, loadProfiles]);

  // Load more when getting close to end
  useEffect(() => {
    if (!exhausted && profiles.length > 0 && index >= profiles.length - 4) {
      const page = Math.floor(profiles.length / 20);
      loadProfiles(filters, page);
    }
  }, [index, profiles.length, exhausted, filters, loadProfiles]);

  const handleLike = useCallback(async () => {
    const current = profiles[index];
    if (!current) return;
    setLikeAnim(true);
    setTimeout(() => { setLikeAnim(false); setIndex((i) => i + 1); }, 300);

    const res  = await fetch("/api/feed/like", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ targetId: current.id, intent: filters.intent || current.intent }),
    });
    const data = await res.json();

    if (data.mutual && !data.alreadyMatched) {
      setMatch({ matchId: data.matchId, theirProfile: current });
      setMatchCount((c) => c + 1);
    }
  }, [profiles, index, filters.intent]);

  const handleSkip = useCallback(async () => {
    const current = profiles[index];
    if (!current) return;
    setSkipAnim(true);
    setTimeout(() => { setSkipAnim(false); setIndex((i) => i + 1); }, 300);

    await fetch("/api/feed/skip", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ targetId: current.id }),
    });
  }, [profiles, index]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "l") handleLike();
      if (e.key === "ArrowLeft"  || e.key === "s") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleLike, handleSkip]);

  const visibleProfiles = profiles.slice(index, index + 3);
  const hasCards        = visibleProfiles.length > 0;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: "calc(100vh - 0px)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-4 shrink-0">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Merit Feed</h1>
          <p className="font-tech text-xs text-white/40">Campus-verified · Anonymous until matched</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterPanel filters={filters} onChange={(f) => setFilters(f)} />
          <Link
            href="/feed/matches"
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/3 font-tech text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
          >
            Matches
            {matchCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-violet-500 text-white font-display font-bold text-xs flex items-center justify-center">
                {matchCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {loading && !hasCards ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <p className="font-tech text-sm text-white/40">Loading your feed…</p>
          </div>
        ) : !hasCards ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="text-6xl mb-4">✦</div>
            <h2 className="font-display font-bold text-white text-2xl mb-2">
              {exhausted ? "All caught up!" : "No one here yet"}
            </h2>
            <p className="font-tech text-sm text-white/50 mb-6">
              {exhausted
                ? "You've seen everyone on your campus. Check back soon — new members join daily."
                : "No profiles match your filters. Try broadening them."}
            </p>
            <button
              onClick={() => setFilters({ intent: "", skill: "", branch: "", year: "" })}
              className="px-6 py-3 rounded-xl btn-primary text-white font-display font-semibold text-sm"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <>
            {/* Card stack */}
            <div
              className="relative w-full max-w-sm"
              style={{ height: "min(560px, calc(100vh - 240px))" }}
            >
              <AnimatePresence>
                {visibleProfiles.map((profile, i) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isTop={i === 0}
                    stackIndex={i}
                    onLike={handleLike}
                    onSkip={handleSkip}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6 mt-6 shrink-0">
              {/* Skip */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleSkip}
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 border-white/15 bg-white/4 text-white/60 hover:border-red-400/50 hover:text-red-400 hover:bg-red-400/8 transition-all shadow-lg"
                animate={skipAnim ? { x: [-8, 8, -4, 0], rotate: [-10, 10, -5, 0] } : {}}
              >
                ✕
              </motion.button>

              {/* Like */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleLike}
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl border-2 border-violet-500/40 btn-primary text-white shadow-lg glow-violet"
                animate={likeAnim ? { scale: [1, 1.2, 1] } : {}}
              >
                ♥
              </motion.button>

              {/* Info */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-tech text-xs text-white/30 text-center leading-tight">
                ←<br/>skip<br/><br/>like<br/>→
              </div>
            </div>

            {/* Keyboard hint */}
            <p className="font-tech text-xs text-white/20 mt-3">
              ← Skip &nbsp;·&nbsp; Like →
            </p>
          </>
        )}
      </div>

      {/* Match modal */}
      <AnimatePresence>
        {match && (
          <MatchModal
            key={match.matchId}
            matchId={match.matchId}
            myProfile={myProfile}
            theirProfile={match.theirProfile}
            onClose={() => setMatch(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
