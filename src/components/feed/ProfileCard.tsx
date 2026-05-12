"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";

export type FeedProfile = {
  id:                string;
  pseudonym:         string;
  college:           string;
  branch:            string | null;
  batch_year:        number | null;
  bio:               string | null;
  interests:         string[] | null;
  avatar_color:      string;
  reliability_score: number;
  intent:            string | null;
  github_url:        string | null;
  badges: Array<{ category: string; difficulty: number }>;
};

const CATEGORY_COLOR: Record<string, string> = {
  coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981",
};
const CATEGORY_LABEL: Record<string, string> = {
  coding: "Coding", writing: "Writing", quiz: "Quiz/DSA", design: "Design",
};
const INTENT_LABEL: Record<string, { icon: string; text: string }> = {
  project:    { icon: "⚡", text: "Project Teammate" },
  study:      { icon: "📚", text: "Study Partner" },
  co_founder: { icon: "🚀", text: "Co-Founder" },
  roommate:   { icon: "🏠", text: "Roommate" },
  general:    { icon: "✦", text: "Open to Connect" },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="font-tech text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

interface Props {
  profile:     FeedProfile;
  onLike:      () => void;
  onSkip:      () => void;
  isTop:       boolean;
  stackIndex:  number; // 0 = top, 1 = second, 2 = third
}

export default function ProfileCard({ profile, onLike, onSkip, isTop, stackIndex }: Props) {
  const x       = useMotionValue(0);
  const rotate  = useTransform(x, [-300, 0, 300], [-18, 0, 18]);

  // Overlay opacities
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -20], [1, 0]);

  // Card tint
  const likeTint = useTransform(x, [0, 150], ["rgba(16,185,129,0)", "rgba(16,185,129,0.08)"]);
  const skipTint = useTransform(x, [-150, 0], ["rgba(239,68,68,0.08)", "rgba(239,68,68,0)"]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeRight = offset.x > 100 || velocity.x > 500;
    const swipeLeft  = offset.x < -100 || velocity.x < -500;

    if (swipeRight) {
      animate(x, 600, { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] });
      setTimeout(onLike, 200);
    } else if (swipeLeft) {
      animate(x, -600, { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] });
      setTimeout(onSkip, 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
    }
  };

  const scoreColor =
    profile.reliability_score >= 80 ? "#10b981" :
    profile.reliability_score >= 60 ? "#f59e0b" : "#ef4444";

  const intent = INTENT_LABEL[profile.intent ?? "general"] ?? INTENT_LABEL.general;

  // Stack transform: each card behind is scaled down and shifted
  const scale   = 1 - stackIndex * 0.04;
  const yOffset = stackIndex * 14;

  return (
    <motion.div
      style={{
        x:        isTop ? x : 0,
        rotate:   isTop ? rotate : 0,
        scale,
        y:        yOffset,
        position: "absolute",
        inset:    0,
        zIndex:   30 - stackIndex * 10,
        cursor:   isTop ? "grab" : "default",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      {/* Card */}
      <div
        className="relative h-full rounded-3xl border border-white/10 overflow-hidden flex flex-col"
        style={{
          background: `linear-gradient(160deg, ${profile.avatar_color}14 0%, rgba(13,13,26,0.95) 40%)`,
        }}
      >
        {/* Tint overlays for swipe direction */}
        {isTop && (
          <>
            <motion.div className="absolute inset-0 rounded-3xl pointer-events-none z-10" style={{ backgroundColor: likeTint }} />
            <motion.div className="absolute inset-0 rounded-3xl pointer-events-none z-10" style={{ backgroundColor: skipTint }} />
          </>
        )}

        {/* LIKE / SKIP stamp */}
        {isTop && (
          <>
            <motion.div
              className="absolute top-8 left-6 z-20 px-4 py-2 rounded-xl border-2 border-emerald-400 rotate-[-20deg]"
              style={{ opacity: likeOpacity }}
            >
              <span className="font-display font-black text-emerald-400 text-2xl tracking-widest">LIKE ♥</span>
            </motion.div>
            <motion.div
              className="absolute top-8 right-6 z-20 px-4 py-2 rounded-xl border-2 border-red-400 rotate-[20deg]"
              style={{ opacity: skipOpacity }}
            >
              <span className="font-display font-black text-red-400 text-2xl tracking-widest">SKIP ✕</span>
            </motion.div>
          </>
        )}

        {/* Card content */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Header: avatar + name + college */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-2xl text-white shrink-0"
              style={{
                backgroundColor: profile.avatar_color,
                boxShadow: `0 0 20px ${profile.avatar_color}60`,
              }}
            >
              {profile.pseudonym[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-white text-xl leading-tight truncate">
                {profile.pseudonym}
              </h2>
              <p className="font-tech text-sm text-white/60 mt-0.5">
                {profile.college}
              </p>
              <p className="font-tech text-xs text-white/40">
                {[profile.branch, profile.batch_year].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div>
              <p className="font-tech text-xs text-white/40 mb-2 tracking-wider">VERIFIED SKILLS</p>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((b, i) => {
                  const color = CATEGORY_COLOR[b.category] ?? "#a855f7";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      <span className="font-pixel text-xs" style={{ color }}>◈</span>
                      <span className="font-tech text-xs font-medium" style={{ color }}>
                        {CATEGORY_LABEL[b.category]} L{b.difficulty}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-px bg-white/8" />

          {/* Intent */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 w-fit">
            <span className="text-base">{intent.icon}</span>
            <span className="font-tech text-sm text-white/80 font-medium">Looking for: {intent.text}</span>
          </div>

          {/* Bio */}
          {profile.bio?.trim() && (
            <div>
              <p className="font-tech text-sm text-white/70 leading-relaxed line-clamp-4">
                "{profile.bio.trim()}"
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.slice(0, 5).map((interest) => (
                <span
                  key={interest}
                  className="font-tech text-xs text-white/50 px-2 py-1 rounded-lg bg-white/4 border border-white/8"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          {/* GitHub */}
          {profile.github_url && (
            <p className="font-tech text-xs text-violet-400">
              ↗ {profile.github_url.replace("https://github.com/", "github.com/")}
            </p>
          )}
        </div>

        {/* Score bar — pinned to bottom */}
        <div className="px-6 py-4 border-t border-white/8 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-tech text-xs text-white/40">Reliability Score</span>
            <span className="font-tech text-xs font-semibold" style={{ color: scoreColor }}>
              {profile.reliability_score >= 80 ? "RELIABLE" :
               profile.reliability_score >= 60 ? "MIXED" : "CAUTION"}
            </span>
          </div>
          <ScoreBar score={profile.reliability_score} color={scoreColor} />
        </div>
      </div>
    </motion.div>
  );
}
