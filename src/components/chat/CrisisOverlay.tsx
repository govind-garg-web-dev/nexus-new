"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HELPLINES } from "@/lib/crisis-keywords";

interface Props {
  onDismiss:    () => void;
  onSafe:       () => void;
  onNotSafe:    () => void;
}

export default function CrisisOverlay({ onDismiss, onSafe, onNotSafe }: Props) {
  const [phase, setPhase] = useState<"check" | "help">("check");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
          style={{ background: "#0d0d1a" }}
        >
          {phase === "check" ? (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-xl shrink-0">
                  💛
                </div>
                <div>
                  <p className="font-display font-bold text-white text-base">We noticed something.</p>
                  <p className="font-tech text-xs text-white/50">This is not an alert — just checking in.</p>
                </div>
              </div>

              <p className="font-tech text-sm text-white/70 leading-relaxed mb-6">
                Some words in your message made us want to pause and ask:
                <span className="text-white font-semibold"> Are you safe right now?</span>
              </p>

              <p className="font-tech text-xs text-white/40 mb-5">
                This is not a replacement for professional help. If you&apos;re going through something difficult, you don&apos;t have to face it alone.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { onSafe(); onDismiss(); }}
                  className="flex-1 py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-display font-semibold text-sm hover:bg-emerald-500/15 transition-colors"
                >
                  I&apos;m safe ✓
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setPhase("help")}
                  className="flex-1 py-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-display font-semibold text-sm hover:bg-amber-500/15 transition-colors"
                >
                  I need support
                </motion.button>
              </div>

              <button
                onClick={onDismiss}
                className="w-full mt-3 font-tech text-xs text-white/30 hover:text-white/50 transition-colors py-2"
              >
                Dismiss and continue
              </button>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xl shrink-0">
                  🫂
                </div>
                <div>
                  <p className="font-display font-bold text-white text-base">You&apos;re not alone.</p>
                  <p className="font-tech text-xs text-white/50">Free, confidential support — call or WhatsApp.</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {HELPLINES.map((h) => (
                  <a
                    key={h.name}
                    href={`tel:${h.number.replace(/-/g, "")}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all group"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div>
                      <p className="font-display font-semibold text-white text-sm group-hover:text-violet-200 transition-colors">
                        {h.name}
                      </p>
                      <p className="font-tech text-xs text-white/40">{h.hours}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-tech text-sm text-violet-400 font-semibold">{h.number}</p>
                      <p className="font-tech text-xs text-white/30">Tap to call</p>
                    </div>
                  </a>
                ))}
              </div>

              <p className="font-tech text-xs text-white/30 text-center mb-4">
                Nexus is not a counseling service. These are professional helplines.
              </p>

              <button
                onClick={() => { onNotSafe(); onDismiss(); }}
                className="w-full font-tech text-sm text-white/40 hover:text-white transition-colors py-2"
              >
                Go back to conversation
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
