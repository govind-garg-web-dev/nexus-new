"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const floatingCards = [
  {
    name: "PixelMage_87",
    badge: "DESIGN · L3",
    score: 94,
    tag: "Looking for: SIH teammate",
    color: "#a855f7",
    anim: "float-card-a",
    pos: { top: "8%", left: "4%" },
    delay: "0s",
  },
  {
    name: "TensorTanmay",
    badge: "ML · L2",
    score: 91,
    tag: "Backend dev needed",
    color: "#3b82f6",
    anim: "float-card-b",
    pos: { top: "38%", left: "55%" },
    delay: "0.8s",
  },
  {
    name: "ByteBuilder",
    badge: "BACKEND · L3",
    score: 88,
    tag: "Open to co-founder",
    color: "#06b6d4",
    anim: "float-card-c",
    pos: { top: "62%", left: "8%" },
    delay: "1.4s",
  },
  {
    name: "CircuitSage",
    badge: "DSA · L3",
    score: 96,
    tag: "Referral @ Razorpay",
    color: "#10b981",
    anim: "float-card-d",
    pos: { top: "12%", left: "58%" },
    delay: "0.4s",
  },
];

function FloatingCard({
  card,
  index,
}: {
  card: (typeof floatingCards)[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        ...card.pos,
        animation: `${card.anim} ${4.5 + index * 0.7}s ease-in-out infinite`,
        animationDelay: card.delay,
      }}
    >
      <div
        className="glass rounded-2xl p-4 w-52 hover:border-white/15 transition-all duration-300 cursor-default"
        style={{ borderColor: `${card.color}22` }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-pixel text-white shrink-0"
            style={{
              background: `linear-gradient(135deg, ${card.color}30, ${card.color}10)`,
              border: `1px solid ${card.color}35`,
            }}
          >
            {card.name[0]}
          </div>
          <div>
            <p className="font-tech text-[11px] text-white/90 leading-none mb-0.5">{card.name}</p>
            <p className="font-pixel text-[10px] tracking-widest" style={{ color: card.color }}>
              {card.badge}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${card.score}%` }}
              transition={{ delay: 0.9 + index * 0.12, duration: 1, ease: "easeOut" }}
              style={{ backgroundColor: card.color }}
            />
          </div>
          <span className="font-tech text-[10px] text-white/50 shrink-0">{card.score}</span>
        </div>

        {/* Tag */}
        <p className="font-pixel text-[10px] tracking-wide text-white/35">{card.tag}</p>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const [phone, setPhone]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "submitted" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleJoin = async () => {
    const clean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setErrMsg("Enter a valid 10-digit WhatsApp number.");
      return;
    }
    setStatus("loading");
    const res  = await fetch("/api/waitlist", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone: clean, source: "hero" }),
    });
    if (res.ok) {
      setStatus("submitted");
    } else {
      const d = await res.json();
      setErrMsg(d.error ?? "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden dot-grid">
      {/* ── Ambient gradient orbs ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "10%",
          left: "-15%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
          animation: "float-orb-1 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "5%",
          right: "-10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.11) 0%, transparent 70%)",
          animation: "float-orb-2 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 500,
          background:
            "radial-gradient(ellipse, rgba(168,85,247,0.05) 0%, transparent 65%)",
        }}
      />

      {/* ── Content grid ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 w-full grid lg:grid-cols-2 gap-12 items-center min-h-screen">
        {/* Left: copy */}
        <div>
          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass border border-violet-500/20 mb-8"
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
            />
            <span className="font-pixel text-violet-300 text-sm tracking-[0.22em]">
              CAMPUS VERIFIED. SKILL PROVEN.
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-bold leading-[1.08] text-white mb-6"
            style={{ fontSize: "clamp(2.8rem, 6vw, 5.2rem)" }}
          >
            Your campus.
            <br />
            Your{" "}
            <span className="font-script italic gradient-text" style={{ fontSize: "1.05em" }}>
              people.
            </span>
            <br />
            <span className="font-pixel text-[#4a4a6a]" style={{ fontSize: "0.65em", letterSpacing: "0.14em" }}>
              NO CLOUT. NO DRAMA.
            </span>
          </motion.h1>

          {/* Sub copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7 }}
            className="text-[#7a7a9a] text-lg leading-relaxed max-w-[480px] mb-10"
          >
            MatchBatch is the anonymous, skill-verified network for Indian college students.
            Find teammates, roommates, and referrals based on{" "}
            <em className="font-script text-violet-300 not-italic text-xl">merit</em>
            , not who you know.
          </motion.p>

          {/* WhatsApp CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {status !== "submitted" ? (
              <div className="max-w-md">
                <div className="flex gap-3 mb-2">
                  {/* +91 prefix */}
                  <div className="flex items-center gap-2 px-3.5 py-3.5 rounded-xl glass border border-white/[0.08] shrink-0">
                    <span className="text-base">🇮🇳</span>
                    <span className="font-tech text-sm text-white/70">+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="WhatsApp number"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setErrMsg(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    className="flex-1 px-4 py-3.5 rounded-xl glass border border-white/[0.08] text-white placeholder-[#3a3a5a] font-tech text-sm focus:outline-none focus:border-green-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleJoin}
                    disabled={status === "loading"}
                    className="px-5 py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm whitespace-nowrap disabled:opacity-60"
                  >
                    {status === "loading" ? "…" : "Join →"}
                  </motion.button>
                </div>
                {errMsg && <p className="font-tech text-xs text-red-400 ml-1">{errMsg}</p>}
                <p className="font-tech text-xs text-white/30 ml-1 mt-1.5">
                  We'll WhatsApp you when we launch on your campus.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-5 py-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06]"
              >
                <span className="text-emerald-400 text-lg">✓</span>
                <span className="font-tech text-sm text-emerald-300">
                  You&apos;re on the list — we&apos;ll WhatsApp you when we launch on your campus.
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Returning user sign-in */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.52 }}
            className="font-tech text-xs text-[#4a4a6a] mt-3"
          >
            Already on MatchBatch?{" "}
            <a
              href="/sign-in"
              className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2 decoration-violet-500/30"
            >
              Sign in →
            </a>
          </motion.p>

          {/* Social proof avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3 mt-7"
          >
            <div className="flex -space-x-2">
              {["#7c3aed", "#2563eb", "#06b6d4", "#10b981", "#f59e0b"].map(
                (color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[#06060e] flex items-center justify-center font-pixel text-white text-xs"
                    style={{ backgroundColor: color }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                )
              )}
            </div>
            <p className="font-tech text-xs text-[#5a5a7a]">
              <span className="text-white/80">800+</span> students already waiting
            </p>
          </motion.div>

          {/* Scroll nudge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="hidden lg:flex flex-col items-start gap-1.5 mt-16"
          >
            <span className="font-pixel text-[10px] text-[#3a3a5a] tracking-[0.3em]">SCROLL TO EXPLORE</span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="w-px h-7"
              style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.5), transparent)" }}
            />
          </motion.div>
        </div>

        {/* Right: floating cards canvas */}
        <div className="relative h-[480px] hidden lg:block">
          {/* Connecting dashed lines (decorative SVG) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.12]"
            viewBox="0 0 500 480"
            fill="none"
          >
            <defs>
              <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <path d="M60 60 Q 200 200 280 190" stroke="url(#lg1)" strokeWidth="1" strokeDasharray="5 5" />
            <path d="M280 190 Q 350 180 300 60" stroke="url(#lg1)" strokeWidth="1" strokeDasharray="5 5" />
            <path d="M60 60 Q 100 260 70 300" stroke="url(#lg1)" strokeWidth="1" strokeDasharray="5 5" />
            <path d="M280 190 Q 200 300 70 300" stroke="url(#lg1)" strokeWidth="1" strokeDasharray="5 5" />
            <circle cx="60" cy="60" r="3" fill="#7c3aed" opacity="0.6" />
            <circle cx="280" cy="190" r="3" fill="#3b82f6" opacity="0.6" />
            <circle cx="300" cy="60" r="3" fill="#10b981" opacity="0.6" />
            <circle cx="70" cy="300" r="3" fill="#06b6d4" opacity="0.6" />
          </svg>

          {/* Profile cards */}
          {floatingCards.map((card, i) => (
            <FloatingCard key={card.name} card={card} index={i} />
          ))}

          {/* Center glow pulse */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 200,
              height: 200,
              background:
                "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
              animation: "pulse-dot 4s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}
