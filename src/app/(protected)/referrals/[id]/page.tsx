"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Applicant = {
  applicationId: string; status: string; note: string | null;
  profile: { pseudonym: string; avatar_color: string; reliability_score: number; bio: string | null } | null;
  badges: { category: string; difficulty: number }[];
};
type Revealed = { name: string; email: string | null; avatarUrl: string | null };

const CATEGORY_COLOR: Record<string, string> = { coding: "#a855f7", writing: "#3b82f6", quiz: "#06b6d4", design: "#10b981" };

export default function ReferralApplicantsPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selecting, setSelecting]   = useState<string | null>(null);
  const [revealed, setRevealed]     = useState<{ appId: string; data: Revealed } | null>(null);

  useEffect(() => {
    fetch(`/api/referrals/${id}/select`)
      .then((r) => r.json())
      .then((d) => { setApplicants(d.applicants ?? []); setLoading(false); });
  }, [id]);

  const select = async (applicationId: string) => {
    setSelecting(applicationId);
    const res  = await fetch(`/api/referrals/${id}/select`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const data = await res.json();
    setSelecting(null);
    if (!res.ok) return;
    setRevealed({ appId: applicationId, data: data.revealed });
    // Refresh list
    fetch(`/api/referrals/${id}/select`).then((r) => r.json()).then((d) => setApplicants(d.applicants ?? []));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <button onClick={() => router.back()} className="font-tech text-sm text-white/40 hover:text-white transition-colors mb-8">← Back</button>
      <h1 className="font-display font-bold text-white text-3xl mb-2">Applicants</h1>
      <p className="font-tech text-sm text-white/50 mb-8">
        Anonymous profiles below — pick one to reveal their identity. Only you see their real name.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : applicants.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No applicants yet</p>
          <p className="font-tech text-sm text-white/40">Share the event hub with your college network.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((a, i) => (
            <motion.div key={a.applicationId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border p-5 ${a.status === "selected" ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/8"}`}
              style={{ background: a.status === "selected" ? undefined : "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-xl text-white shrink-0"
                  style={{ backgroundColor: a.profile?.avatar_color ?? "#7c3aed" }}>
                  {a.profile?.pseudonym[0].toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-display font-bold text-white text-base">{a.profile?.pseudonym}</p>
                    <p className="font-tech text-xs text-white/40">Score {a.profile?.reliability_score}</p>
                    {a.status === "selected" && <span className="font-pixel text-[10px] text-emerald-400 tracking-widest">SELECTED</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {a.badges.map((b, j) => (
                      <span key={j} className="font-tech text-xs px-2 py-0.5 rounded"
                        style={{ color: CATEGORY_COLOR[b.category] ?? "#a855f7", background: `${CATEGORY_COLOR[b.category] ?? "#a855f7"}12`, border: `1px solid ${CATEGORY_COLOR[b.category] ?? "#a855f7"}25` }}>
                        {b.category} L{b.difficulty}
                      </span>
                    ))}
                  </div>
                  {a.note && <p className="font-tech text-sm text-white/60 leading-relaxed mb-2">"{a.note}"</p>}
                  {a.profile?.bio && <p className="font-tech text-xs text-white/40 line-clamp-2">{a.profile.bio}</p>}
                </div>
                {a.status === "pending" && (
                  <button onClick={() => select(a.applicationId)} disabled={selecting === a.applicationId}
                    className="shrink-0 px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                    {selecting === a.applicationId ? "…" : "Select →"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Identity reveal modal */}
      <AnimatePresence>
        {revealed && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setRevealed(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-emerald-500/20 p-8 text-center"
              style={{ background: "rgba(16,185,129,0.06)", backdropFilter: "blur(24px)" }}>
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="font-display font-bold text-white text-2xl mb-1">Identity Revealed</h2>
              <p className="font-tech text-sm text-white/50 mb-6">Only you can see this. Connect via email or in-app chat.</p>
              {revealed.data.avatarUrl && (
                <Image src={revealed.data.avatarUrl} alt="" width={64} height={64} className="w-16 h-16 rounded-full mx-auto mb-4" unoptimized />
              )}
              <p className="font-display font-bold text-white text-xl mb-1">{revealed.data.name}</p>
              <p className="font-tech text-sm text-violet-400 mb-6">{revealed.data.email}</p>
              <button onClick={() => setRevealed(null)}
                className="w-full py-3 rounded-2xl btn-primary text-white font-display font-bold">
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
