"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { FeedProfile } from "./ProfileCard";

interface Props {
  matchId:      string;
  myProfile:    { pseudonym: string; avatar_color: string };
  theirProfile: FeedProfile;
  onClose:      () => void;
}

// Simple confetti particle
function Particle({ delay }: { delay: number }) {
  const colors = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];
  const color  = colors[Math.floor(Math.random() * colors.length)];
  const left   = `${Math.random() * 100}%`;
  const size   = 4 + Math.random() * 6;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left, top: -10, width: size, height: size, backgroundColor: color }}
      initial={{ y: -10, opacity: 1, rotate: 0 }}
      animate={{ y: "110vh", opacity: [1, 1, 0], rotate: Math.random() * 720 - 360 }}
      transition={{ duration: 2.5 + Math.random() * 1.5, delay, ease: "easeIn" }}
    />
  );
}

export default function MatchModal({ matchId, myProfile, theirProfile, onClose }: Props) {
  const router = useRouter();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Confetti */}
      {Array.from({ length: 40 }).map((_, i) => (
        <Particle key={i} delay={i * 0.05} />
      ))}

      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        className="relative z-10 text-center px-8 max-w-sm w-full"
      >
        {/* Glowing ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)", transform: "scale(2)" }}
          />

          {/* Two avatars overlapping */}
          <div className="flex items-center relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-3xl text-white border-4 border-[#06060e] z-10"
              style={{ backgroundColor: myProfile.avatar_color, boxShadow: `0 0 24px ${myProfile.avatar_color}` }}
            >
              {myProfile.pseudonym[0].toUpperCase()}
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl z-20 -mx-2">
              ♥
            </div>
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-3xl text-white border-4 border-[#06060e] z-10"
              style={{ backgroundColor: theirProfile.avatar_color, boxShadow: `0 0 24px ${theirProfile.avatar_color}` }}
            >
              {theirProfile.pseudonym[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display font-black text-white mb-2"
          style={{ fontSize: "clamp(2rem, 6vw, 3rem)" }}
        >
          It&apos;s a{" "}
          <span className="font-script italic gradient-text">Match!</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-tech text-sm text-white/60 mb-2"
        >
          You and{" "}
          <span className="text-white font-medium">{theirProfile.pseudonym}</span> liked each other.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-tech text-xs text-white/40 mb-8"
        >
          Answer one question to reveal your real identities.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/feed/icebreaker/${matchId}`)}
            className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg"
          >
            Send Icebreaker 💬
          </motion.button>
          <button
            onClick={onClose}
            className="w-full py-3 font-tech text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Later — keep swiping
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
