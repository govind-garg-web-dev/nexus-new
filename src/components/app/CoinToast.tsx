"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Toast { id: string; amount: number; reason: string; }

const REASON_LABELS: Record<string, string> = {
  challenge_review:    "Peer review",
  consulting_help:     "Help session completed",
  badge_earned:        "Badge earned",
  event_approved:      "Society event published",
};

export default function CoinToast({ userId }: { userId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`coins-${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "coin_transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; amount: number; reason: string };
          if (row.amount <= 0) return; // don't toast deductions

          const toast: Toast = { id: row.id, amount: row.amount, reason: row.reason };
          setToasts((prev) => [...prev, toast]);
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 4000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-amber-500/25 shadow-2xl"
            style={{ background: "rgba(245,158,11,0.12)", backdropFilter: "blur(16px)" }}
          >
            <span className="text-2xl">🪙</span>
            <div>
              <p className="font-display font-bold text-white text-sm">
                +{t.amount} coins
              </p>
              <p className="font-tech text-xs text-amber-300/80">
                {REASON_LABELS[t.reason] ?? t.reason}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
