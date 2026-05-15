"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "@/components/ui/CustomSelect";

type Listing = {
  id: string; title: string; category: string; condition: string | null;
  price: number; description: string | null; status: string; isMyListing: boolean;
  seller: { pseudonym: string; avatar_color: string; reliability_score: number } | null;
  created_at: string;
};

const CATEGORIES = [
  { value: "",           label: "All",         icon: "📦" },
  { value: "textbook",   label: "Textbooks",   icon: "📚" },
  { value: "electronics",label: "Electronics", icon: "💻" },
  { value: "cycle",      label: "Cycles",      icon: "🚴" },
  { value: "furniture",  label: "Furniture",   icon: "🪑" },
  { value: "clothing",   label: "Clothing",    icon: "👕" },
  { value: "lost_found", label: "Lost & Found",icon: "🔍" },
  { value: "other",      label: "Other",       icon: "📌" },
];
const CONDITIONS = ["new","like_new","good","fair","poor"];
const COND_LABEL: Record<string, string> = { new: "New", like_new: "Like new", good: "Good", fair: "Fair", poor: "Poor" };
const COND_COLOR: Record<string, string> = { new: "#10b981", like_new: "#10b981", good: "#3b82f6", fair: "#f59e0b", poor: "#ef4444" };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function MarketplacePage() {
  const [listings, setListings]   = useState<Listing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [toast, setToast]         = useState("");
  const [interestMsg, setInterestMsg] = useState<{ id: string; note: string } | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm] = useState({ title: "", category: "other", condition: "good", price: "", description: "" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const res = await fetch(`/api/marketplace?${params}`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [category]);

  const post = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: form.price ? parseInt(form.price) : 0 }),
    });
    setSubmitting(false);
    if (res.ok) { setShowForm(false); load(); showToast("Listing posted!"); }
  };

  const expressInterest = async (listingId: string, note: string) => {
    await fetch(`/api/marketplace/${listingId}/interest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: note }),
    });
    setInterestMsg(null);
    showToast("Interest sent! The seller will reach out.");
  };

  const lostFound = listings.filter((l) => l.category === "lost_found");
  const regular   = listings.filter((l) => l.category !== "lost_found");

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Community</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Campus <span className="font-script italic gradient-text">Marketplace</span>
          </h1>
          <p className="font-tech text-sm text-white/40">In-person handoff only · Campus-verified · No shipping</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + List Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(c.value)}
            className={`px-3.5 py-2 rounded-xl font-tech text-sm transition-all ${
              category === c.value ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white hover:border-white/20"
            }`}
            style={{ background: category === c.value ? undefined : "rgba(255,255,255,0.02)" }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Post form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What are you selling/giving away?"
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Category</label>
                  <CustomSelect
                    options={CATEGORIES.slice(1).map((c) => c.label)}
                    value={CATEGORIES.find((c) => c.value === form.category)?.label ?? ""}
                    onChange={(label) => { const found = CATEGORIES.find((c) => c.label === label); if (found) setForm({ ...form, category: found.value }); }}
                    placeholder="Category"
                  />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Condition</label>
                  <CustomSelect options={CONDITIONS.map((c) => COND_LABEL[c])} value={COND_LABEL[form.condition] ?? ""} onChange={(label) => { const found = CONDITIONS.find((c) => COND_LABEL[c] === label); if (found) setForm({ ...form, condition: found }); }} placeholder="Condition" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Price (₹, 0=free)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none bg-transparent" />
                </div>
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description — age, reason for selling, handoff availability…" rows={2}
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={post} disabled={!form.title.trim() || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                  {submitting ? "Posting…" : "Post Listing →"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lost & Found section */}
      {!category && lostFound.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔍</span>
            <h2 className="font-display font-bold text-white text-lg">Lost & Found</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {lostFound.map((l, i) => <ListingCard key={l.id} l={l} i={i} onInterest={setInterestMsg} />)}
          </div>
        </div>
      )}

      {/* Main listings */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : regular.length === 0 && lostFound.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">📦</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">Nothing listed yet</p>
          <p className="font-tech text-sm text-white/40">Be the first to list something.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regular.map((l, i) => <ListingCard key={l.id} l={l} i={i} onInterest={setInterestMsg} />)}
        </div>
      )}

      {/* Interest modal */}
      <AnimatePresence>
        {interestMsg && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setInterestMsg(null); }}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 p-6"
              style={{ background: "#0d0d1a" }}>
              <h2 className="font-display font-bold text-white text-lg mb-2">Express Interest</h2>
              <p className="font-tech text-sm text-white/50 mb-4">The seller will see your pseudonym + reliability score. They contact you to arrange in-person handoff.</p>
              <textarea value={interestMsg.note} onChange={(e) => setInterestMsg({ ...interestMsg, note: e.target.value })}
                placeholder="Optional message to the seller…" rows={3}
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors mb-3" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="flex gap-3">
                <button onClick={() => setInterestMsg(null)} className="flex-1 py-3 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={() => expressInterest(interestMsg.id, interestMsg.note)} className="flex-1 py-3 rounded-xl btn-primary text-white font-display font-bold text-sm">Send Interest →</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl" style={{ backdropFilter: "blur(12px)" }}>
            <span className="text-emerald-400">✓</span>
            <span className="font-display font-semibold text-white text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListingCard({ l, i, onInterest }: { l: Listing; i: number; onInterest: (v: { id: string; note: string }) => void }) {
  const catIcon = CATEGORIES.find((c) => c.value === l.category)?.icon ?? "📦";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className="rounded-2xl border border-white/8 p-5 flex flex-col" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{catIcon}</span>
          {l.condition && (
            <span className="font-tech text-xs px-2 py-0.5 rounded" style={{ color: COND_COLOR[l.condition], background: `${COND_COLOR[l.condition]}15` }}>
              {COND_LABEL[l.condition]}
            </span>
          )}
        </div>
        <p className="font-display font-bold text-white text-lg shrink-0">
          {l.price === 0 ? <span className="text-emerald-400 text-sm">FREE</span> : `₹${l.price}`}
        </p>
      </div>
      <h3 className="font-display font-bold text-white text-base mb-2 line-clamp-2">{l.title}</h3>
      {l.description && <p className="font-tech text-xs text-white/50 leading-relaxed line-clamp-2 mb-3">{l.description}</p>}
      <div className="flex items-center gap-2 mb-3 mt-auto">
        <div className="w-5 h-5 rounded flex items-center justify-center font-display font-bold text-xs text-white shrink-0"
          style={{ backgroundColor: l.seller?.avatar_color ?? "#7c3aed" }}>
          {l.seller?.pseudonym[0].toUpperCase() ?? "?"}
        </div>
        <span className="font-tech text-xs text-white/30">{l.seller?.pseudonym} · {timeAgo(l.created_at)}</span>
      </div>
      {!l.isMyListing && (
        <button onClick={() => onInterest({ id: l.id, note: "" })}
          className="w-full py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          I&apos;m Interested →
        </button>
      )}
      {l.isMyListing && <p className="font-tech text-xs text-violet-400 text-center">Your listing</p>}
    </motion.div>
  );
}
