"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type Report = {
  id: string; category: string; description: string | null; score_delta: number;
  status: string; created_at: string;
  reportedProfile: { pseudonym: string; reliability_score: number } | null;
};
type Confession = { id: string; content: string; toxicity_score: number | null; created_at: string; };
type IdRequest  = { id: string; user_id: string; photo_url: string; created_at: string; };

type Queue = {
  reports: Report[];
  flaggedMessages: { id: string; content: string; flag_reason: string; created_at: string }[];
  pendingConfessions: Confession[];
  vaultFlags: { id: string; reason: string; created_at: string; vault_uploads: { title: string; file_url: string } | null }[];
  idRequests: IdRequest[];
};

const SLA_MINS = 30;

function SlaChip({ createdAt }: { createdAt: string }) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const over = mins > SLA_MINS;
  return (
    <span className={`font-pixel text-[10px] tracking-widest px-2 py-0.5 rounded ${
      over ? "text-red-400 bg-red-500/15 border border-red-500/25" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
    }`}>
      {over ? `⚠ ${mins}m — SLA BREACHED` : `${mins}m ago`}
    </span>
  );
}

export default function ModDashboardPage() {
  const [queue, setQueue]   = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<"reports"|"messages"|"confessions"|"vault"|"ids">("reports");
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError]   = useState("");

  const load = async () => {
    const res  = await fetch("/api/mod/queue");
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setQueue(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (type: string, itemId: string, action: string) => {
    setActing(itemId);
    await fetch("/api/mod/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, itemId, action }),
    });
    setActing(null);
    load();
  };

  const tabs = [
    { key: "reports",     label: "Reports",      count: queue?.reports.length ?? 0 },
    { key: "messages",    label: "Flagged Msgs",  count: queue?.flaggedMessages.length ?? 0 },
    { key: "confessions", label: "Confessions",  count: queue?.pendingConfessions.length ?? 0 },
    { key: "vault",       label: "Vault Flags",  count: queue?.vaultFlags.length ?? 0 },
    { key: "ids",         label: "ID Verify",    count: queue?.idRequests.length ?? 0 },
  ];

  const totalPending = tabs.reduce((s, t) => s + t.count, 0);

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display font-bold text-white text-4xl">Moderator Dashboard</h1>
          {totalPending > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25 font-pixel text-xs text-red-400 tracking-widest">
              {totalPending} PENDING
            </span>
          )}
        </div>
        <p className="font-tech text-sm text-white/40">30-minute SLA · All actions are logged · Admin-only</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 mb-6">
          <p className="font-tech text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-tech text-sm transition-all ${
              tab === t.key ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white"
            }`}
            style={{ background: tab === t.key ? undefined : "rgba(255,255,255,0.02)" }}>
            {t.label}
            {t.count > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white font-display font-bold text-xs flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Reports */}
          {tab === "reports" && (queue?.reports ?? []).map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-tech text-xs px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      {r.category.replace("_", " ")}
                    </span>
                    <span className="font-tech text-xs text-white/40">Score delta: {r.score_delta}</span>
                    <SlaChip createdAt={r.created_at} />
                  </div>
                  {r.reportedProfile && (
                    <p className="font-display font-semibold text-white text-sm mb-1">
                      {r.reportedProfile.pseudonym} · Score {r.reportedProfile.reliability_score}
                    </p>
                  )}
                  {r.description && <p className="font-tech text-sm text-white/60 leading-relaxed">"{r.description}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act("report", r.id, "dismiss")} disabled={acting === r.id}
                    className="px-3 py-2 rounded-xl border border-white/10 font-tech text-xs text-white/40 hover:text-white transition-colors disabled:opacity-40">
                    Dismiss
                  </button>
                  <button onClick={() => act("report", r.id, "verify")} disabled={acting === r.id}
                    className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 font-display font-semibold text-xs hover:bg-red-500/20 transition-colors disabled:opacity-40">
                    {acting === r.id ? "…" : `Verify (${r.score_delta}pts)`}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {tab === "reports" && (queue?.reports ?? []).length === 0 && (
            <Empty label="No pending reports" />
          )}

          {/* Flagged messages */}
          {tab === "messages" && (queue?.flaggedMessages ?? []).map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-tech text-xs text-red-400">Threat/profanity flagged</span>
                    <SlaChip createdAt={m.created_at} />
                  </div>
                  <p className="font-tech text-sm text-white/80 leading-relaxed break-words">"{m.content}"</p>
                  <p className="font-tech text-xs text-white/30 mt-1">Reason: {m.flag_reason}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act("message", m.id, "dismiss")} disabled={acting === m.id}
                    className="px-3 py-2 rounded-xl border border-white/10 font-tech text-xs text-white/40 hover:text-white">Dismiss</button>
                  <button onClick={() => act("message", m.id, "verify")} disabled={acting === m.id}
                    className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 font-display font-semibold text-xs hover:bg-red-500/20">
                    {acting === m.id ? "…" : "Penalise (−10)"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {tab === "messages" && (queue?.flaggedMessages ?? []).length === 0 && <Empty label="No flagged messages" />}

          {/* Pending confessions */}
          {tab === "confessions" && (queue?.pendingConfessions ?? []).map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {c.toxicity_score !== null && (
                      <span className="font-tech text-xs text-amber-400">
                        Toxicity: {Math.round(c.toxicity_score * 100)}%
                      </span>
                    )}
                    <SlaChip createdAt={c.created_at} />
                  </div>
                  <p className="font-tech text-sm text-white/80 leading-relaxed whitespace-pre-wrap">"{c.content}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act("confession", c.id, "reject")} disabled={acting === c.id}
                    className="px-3 py-2 rounded-xl border border-red-500/20 text-red-400 font-tech text-xs hover:bg-red-500/10">Reject</button>
                  <button onClick={() => act("confession", c.id, "approve")} disabled={acting === c.id}
                    className="px-3 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-display font-semibold text-xs hover:bg-emerald-500/15">
                    {acting === c.id ? "…" : "Approve"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {tab === "confessions" && (queue?.pendingConfessions ?? []).length === 0 && <Empty label="No pending confessions" />}

          {/* Vault flags */}
          {tab === "vault" && (queue?.vaultFlags ?? []).map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display font-semibold text-white text-sm mb-1">
                    {(f.vault_uploads as { title: string; file_url: string } | null)?.title ?? "Unknown file"}
                  </p>
                  <p className="font-tech text-sm text-white/60 mb-2">Reason: {f.reason}</p>
                  <SlaChip createdAt={f.created_at} />
                </div>
                <div className="flex gap-2">
                  <a href={(f.vault_uploads as { title: string; file_url: string } | null)?.file_url ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl border border-white/10 font-tech text-xs text-violet-400">View</a>
                  <button onClick={() => act("vault_flag", f.id, "dismiss")} disabled={acting === f.id}
                    className="px-3 py-2 rounded-xl border border-white/10 font-tech text-xs text-white/40">Dismiss</button>
                  <button onClick={() => act("vault_flag", f.id, "verify")} disabled={acting === f.id}
                    className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 font-display font-semibold text-xs hover:bg-red-500/20">
                    {acting === f.id ? "…" : "Remove File"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {tab === "vault" && (queue?.vaultFlags ?? []).length === 0 && <Empty label="No vault flags" />}

          {/* ID verification */}
          {tab === "ids" && (queue?.idRequests ?? []).map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photo_url} alt="College ID" className="w-32 h-24 object-cover rounded-xl border border-white/10 shrink-0" />
                <div className="flex-1">
                  <p className="font-tech text-xs text-white/40 mb-2">User: {r.user_id.slice(0, 8)}…</p>
                  <SlaChip createdAt={r.created_at} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => act("id_verification", r.id, "reject")} disabled={acting === r.id}
                      className="flex-1 py-2 rounded-xl border border-red-500/20 text-red-400 font-tech text-xs hover:bg-red-500/10">Reject</button>
                    <button onClick={() => act("id_verification", r.id, "approve")} disabled={acting === r.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-display font-semibold text-xs hover:bg-emerald-500/15">
                      {acting === r.id ? "…" : "Approve ID"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {tab === "ids" && (queue?.idRequests ?? []).length === 0 && <Empty label="No ID verification requests" />}
        </div>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/8 p-10 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
      <p className="text-3xl mb-2">✓</p>
      <p className="font-display font-semibold text-white/50 text-lg">{label}</p>
    </div>
  );
}
