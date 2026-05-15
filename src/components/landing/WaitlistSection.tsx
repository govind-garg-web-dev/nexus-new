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
  const [phone, setPhone]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "submitted" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const handleJoin = async () => {
    const clean = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setErrMsg("Enter a valid 10-digit WhatsApp number.");
      return;
    }
    setStatus("loading");
    const res = await fetch("/api/waitlist", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone: clean, source: "waitlist_section" }),
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
    <section className="py-28 px-6 relative" id="waitlist">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 800, height: 500,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-violet-500/25 mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span className="font-pixel text-sm tracking-[0.2em] text-emerald-300">WAITLIST IS OPEN</span>
            </motion.div>

            <h2 className="font-display font-bold text-white mb-3 leading-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Be first.{" "}
              <span className="font-script italic gradient-text" style={{ fontSize: "1.05em" }}>Be verified.</span>
            </h2>

            <p className="text-[#7a7a9a] text-lg mb-8 max-w-md mx-auto">
              We&apos;re launching on one campus first. Drop your WhatsApp number — we&apos;ll message you directly when we&apos;re live near you.
            </p>

            {/* WhatsApp input */}
            {status !== "submitted" ? (
              <div className="max-w-sm mx-auto mb-8">
                <div className="flex gap-2 mb-2">
                  <div className="flex items-center gap-2 px-3 py-3.5 rounded-xl glass border border-white/10 shrink-0">
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
                    className="flex-1 px-4 py-3.5 rounded-xl glass border border-white/10 text-white placeholder-[#3a3a5a] font-tech text-sm focus:outline-none focus:border-green-500/40 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleJoin}
                    disabled={status === "loading"}
                    className="px-5 py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm whitespace-nowrap disabled:opacity-60"
                  >
                    {status === "loading" ? "…" : "Join →"}
                  </motion.button>
                </div>
                {errMsg && <p className="font-tech text-xs text-red-400 text-left ml-1">{errMsg}</p>}
                <p className="font-tech text-xs text-white/30 text-left ml-1 mt-1">
                  We&apos;ll only WhatsApp you for the launch. No spam.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] mb-8"
              >
                <span className="text-emerald-400 text-xl">✓</span>
                <div className="text-left">
                  <p className="font-display font-semibold text-emerald-300 text-sm">You&apos;re on the list!</p>
                  <p className="font-tech text-xs text-emerald-600">We&apos;ll WhatsApp you when we launch on your campus.</p>
                </div>
              </motion.div>
            )}

            {/* Perks */}
            <div className="grid sm:grid-cols-2 gap-3 text-left max-w-md mx-auto">
              {perks.map((perk, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-start gap-2.5">
                  <span className="font-pixel text-violet-400 text-sm mt-0.5 shrink-0">{perk.icon}</span>
                  <span className="font-tech text-xs text-[#6a6a8a] leading-relaxed">{perk.text}</span>
                </motion.div>
              ))}
            </div>

            <p className="font-tech text-[11px] text-[#3a3a5a] mt-8 tracking-wide">
              Indian numbers only · No spam · We WhatsApp, not email
            </p>

            <p className="font-tech text-xs text-[#3a3a5a] mt-4">
              Already have an account?{" "}
              <a href="/sign-in" className="text-violet-400 hover:text-violet-300 transition-colors">Sign in →</a>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
