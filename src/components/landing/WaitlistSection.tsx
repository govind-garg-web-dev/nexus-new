"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

const perks = [
  { icon: "◈", text: "First access when we launch on your campus" },
  { icon: "◎", text: "Founding member badge on your profile" },
  { icon: "◆", text: "Shape the product — direct feedback channel" },
  { icon: "❋", text: "Campus ambassador invite (paid, with revenue share)" },
];

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const handleJoin = () => {
    if (email.trim()) setStatus("submitted");
  };

  return (
    <section className="py-28 px-6 relative" id="waitlist">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 500,
          background:
            "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Card */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Gradient border effect */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              padding: 1,
              background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(59,130,246,0.4), rgba(6,182,212,0.3))",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          <div className="glass-strong p-10 lg:p-14 text-center">
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-violet-500/25 mb-8"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
              />
              <span className="font-pixel text-sm tracking-[0.2em] text-emerald-300">
                WAITLIST IS OPEN
              </span>
            </motion.div>

            <h2
              className="font-display font-bold text-white mb-3 leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Be first.{" "}
              <span className="font-script italic gradient-text" style={{ fontSize: "1.05em" }}>
                Be verified.
              </span>
            </h2>

            <p className="text-[#7a7a9a] text-lg mb-10 max-w-md mx-auto">
              We&apos;re launching on one campus first. Get early access and help shape what Nexus becomes.
            </p>

            {/* Input */}
            {status === "idle" ? (
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
                <input
                  type="email"
                  placeholder="your@college.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="flex-1 px-4 py-3.5 rounded-xl glass border border-white/[0.1] text-white placeholder-[#3a3a5a] font-tech text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleJoin}
                  className="px-7 py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm whitespace-nowrap"
                >
                  Join Waitlist
                </motion.button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] mb-8 max-w-md mx-auto"
              >
                <span className="text-emerald-400 text-xl">✓</span>
                <div className="text-left">
                  <p className="font-display font-semibold text-emerald-300 text-sm">You&apos;re on the list.</p>
                  <p className="font-tech text-xs text-emerald-600">We&apos;ll reach out when we launch near you.</p>
                </div>
              </motion.div>
            )}

            {/* Perks */}
            <div className="grid sm:grid-cols-2 gap-3 text-left max-w-md mx-auto">
              {perks.map((perk, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-start gap-2.5"
                >
                  <span className="font-pixel text-violet-400 text-sm mt-0.5 shrink-0">{perk.icon}</span>
                  <span className="font-tech text-xs text-[#6a6a8a] leading-relaxed">{perk.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Fine print */}
            <p className="font-tech text-[11px] text-[#3a3a5a] mt-8 tracking-wide">
              College email only · No spam · Unsubscribe anytime
            </p>

            {/* Returning user */}
            <p className="font-tech text-xs text-[#3a3a5a] mt-4">
              Already have an account?{" "}
              <a
                href="/sign-in"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Sign in →
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
