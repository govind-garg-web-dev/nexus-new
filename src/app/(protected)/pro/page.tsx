"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Script from "next/script";

const FEATURES = [
  { icon: "📖", title: "College Courses",     desc: "DSA, DBMS, OS, CN, Software Engineering — exam + placement ready" },
  { icon: "💻", title: "Coding Courses",      desc: "Python, Web Dev, ML, System Design, Competitive Programming" },
  { icon: "🎯", title: "Practice Panel",      desc: "500+ questions — DSA, System Design, Interview, Aptitude, Coding" },
  { icon: "🗣",  title: "Group Discussions",   desc: "Weekly live sessions with peers and mentors" },
  { icon: "🎤", title: "Mock Interviews",     desc: "Weekly live mock interviews — technical and HR" },
  { icon: "👑", title: "Pro Badge",           desc: "Verified Pro badge on your MatchBatch profile" },
];

declare global {
  interface Window { Razorpay: new (opts: object) => { open(): void }; }
}

export default function ProPage() {
  const [isPro, setIsPro]         = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState<"monthly" | "yearly" | null>(null);
  const [toast, setToast]         = useState("");

  useEffect(() => {
    fetch("/api/pro/subscription")
      .then((r) => r.json())
      .then((d) => { setIsPro(d.isPro); setExpiresAt(d.expiresAt); setLoading(false); });
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const subscribe = async (plan: "monthly" | "yearly") => {
    setPaying(plan);
    const res  = await fetch("/api/pro/subscription", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan }),
    });
    const data = await res.json();
    setPaying(null);

    if (data.manual) {
      showToast("Payment gateway is being configured. We'll notify you via WhatsApp shortly!");
      return;
    }

    if (!data.orderId) { showToast("Something went wrong. Please try again."); return; }

    // Open Razorpay checkout
    const options = {
      key:         data.keyId,
      amount:      data.amount,
      currency:    "INR",
      name:        "MatchBatch Pro",
      description: `${plan === "yearly" ? "Yearly" : "Monthly"} Pro Subscription`,
      order_id:    data.orderId,
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verifyRes = await fetch("/api/pro/verify-payment", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            plan,
          }),
        });
        if (verifyRes.ok) {
          setIsPro(true);
          showToast("🎉 Welcome to Pro! All features are now unlocked.");
        }
      },
      prefill:  {},
      theme:    { color: "#7c3aed" },
    };
    new window.Razorpay(options).open();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/25 bg-amber-500/8 mb-6">
            <span className="text-lg">👑</span>
            <span className="font-pixel text-sm tracking-[0.2em] text-amber-300">MATCHBATCH PRO</span>
          </div>
          <h1 className="font-display font-black text-white mb-3" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Unlock your full{" "}
            <span className="font-script italic gradient-text">potential.</span>
          </h1>
          <p className="font-tech text-sm text-white/50 max-w-lg mx-auto">
            Courses, practice, live sessions — everything you need to ace placements and college exams.
          </p>
        </div>

        {/* Already Pro */}
        {isPro && (
          <div className="rounded-3xl border border-amber-500/25 bg-amber-500/6 p-8 text-center mb-10">
            <div className="text-4xl mb-3">👑</div>
            <h2 className="font-display font-bold text-white text-2xl mb-2">You&apos;re Pro!</h2>
            <p className="font-tech text-sm text-white/60 mb-4">
              Your subscription is active
              {expiresAt ? ` until ${new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/pro/courses" className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                Browse Courses →
              </Link>
              <Link href="/pro/practice" className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 font-tech text-sm hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                Practice Panel
              </Link>
            </div>
          </div>
        )}

        {/* Pricing cards */}
        {!isPro && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Monthly */}
            <motion.div whileHover={{ scale: 1.01 }}
              className="rounded-3xl border border-white/10 p-8"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="font-tech text-sm text-white/50 mb-2">Monthly</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display font-black text-white text-5xl">₹999</span>
                <span className="font-tech text-sm text-white/40 mb-2">/month</span>
              </div>
              <p className="font-tech text-xs text-white/30 mb-6">Billed monthly · Cancel anytime</p>
              <button
                onClick={() => subscribe("monthly")}
                disabled={paying !== null}
                className="w-full py-3.5 rounded-2xl border border-white/15 text-white font-display font-bold text-base hover:border-violet-500/40 hover:bg-violet-500/8 transition-all disabled:opacity-40"
              >
                {paying === "monthly" ? "Opening payment…" : "Subscribe Monthly"}
              </button>
            </motion.div>

            {/* Yearly — recommended */}
            <motion.div whileHover={{ scale: 1.01 }}
              className="rounded-3xl p-8 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))", border: "1px solid rgba(124,58,237,0.35)" }}>
              {/* Best value chip */}
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500 text-[#06060e] font-display font-bold text-xs">
                SAVE 50%
              </div>
              <p className="font-tech text-sm text-violet-300 mb-2">Yearly</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display font-black text-white text-5xl">₹5,999</span>
                <span className="font-tech text-sm text-white/40 mb-2">/year</span>
              </div>
              <p className="font-tech text-xs text-violet-300/60 mb-6">
                = ₹500/month · Save ₹5,989 vs monthly
              </p>
              <button
                onClick={() => subscribe("yearly")}
                disabled={paying !== null}
                className="w-full py-3.5 rounded-2xl btn-primary text-white font-display font-bold text-base disabled:opacity-40"
              >
                {paying === "yearly" ? "Opening payment…" : "Subscribe Yearly ✨"}
              </button>
            </motion.div>
          </div>
        )}

        {/* What's included */}
        <div className="mb-10">
          <p className="font-display font-bold text-white text-xl mb-6 text-center">Everything included</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <p className="font-display font-bold text-white text-sm mb-1">{f.title}</p>
                <p className="font-tech text-xs text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick links if Pro */}
        {isPro && (
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { href: "/pro/courses",  label: "Courses",           icon: "📖", desc: "12 courses available" },
              { href: "/pro/practice", label: "Practice Panel",    icon: "🎯", desc: "500+ questions" },
              { href: "/pro/sessions", label: "Group Sessions",    icon: "🗣",  desc: "Weekly live sessions" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-violet-500/20 hover:border-violet-500/40 transition-all text-center"
                style={{ background: "rgba(124,58,237,0.06)" }}>
                <span className="text-3xl">{item.icon}</span>
                <p className="font-display font-bold text-white text-sm">{item.label}</p>
                <p className="font-tech text-xs text-white/40">{item.desc}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl max-w-sm"
            style={{ backdropFilter: "blur(12px)" }}>
            <span className="font-display font-semibold text-white text-sm text-center">{toast}</span>
          </motion.div>
        )}
      </div>
    </>
  );
}
