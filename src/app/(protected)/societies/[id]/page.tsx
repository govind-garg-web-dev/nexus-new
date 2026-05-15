"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Poll = { id: string; question: string; options: string[]; ends_at: string | null; counts: number[]; total: number; myVote: number | null; };
type Recruitment = { id: string; title: string; description: string; criteria: string | null; deadline: string | null; myStatus: string | null; };

export default function SocietyDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [society, setSociety]       = useState<{ name: string; bio: string | null; verified: boolean; isLeader: boolean; verifyRequested?: boolean } | null>(null);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [verifyToast, setVerifyToast] = useState("");
  const [polls, setPolls]           = useState<Poll[]>([]);
  const [recruitment, setRecruitment] = useState<Recruitment[]>([]);
  const [tab, setTab]               = useState<"polls"|"recruitment"|"events">("polls");
  const [loading, setLoading]       = useState(true);
  const [showPollForm, setShowPollForm]   = useState(false);
  const [showRecruitForm, setShowRecruitForm] = useState(false);
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [applyText, setApplyText]   = useState("");
  const [pollForm, setPollForm]     = useState({ question: "", options: ["", ""], endsAt: "" });
  const [recruitForm, setRecruitForm] = useState({ title: "", description: "", criteria: "", deadline: "" });
  const [eventForm, setEventForm]   = useState({
    title: "", description: "", type: "other", organizer: "",
    deadline: "", eventDate: "", link: "", tags: "",
    isCharged: false, ticketPrice: "",
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [showEventForm, setShowEventForm]     = useState(false);
  const [toast, setToast]           = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const [socRes, pollRes, recRes] = await Promise.all([
      fetch("/api/societies").then((r) => r.json()),
      fetch(`/api/societies/${id}/polls`).then((r) => r.json()),
      fetch(`/api/societies/${id}/recruitment`).then((r) => r.json()),
    ]);
    const found = (socRes.societies ?? []).find((s: { id: string }) => s.id === id);
    setSociety(found ?? null);
    setPolls(pollRes.polls ?? []);
    setRecruitment(recRes.postings ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const votePoll = async (pollId: string, optionIndex: number) => {
    setPolls((prev) => prev.map((p) => {
      if (p.id !== pollId) return p;
      const counts = [...p.counts];
      counts[optionIndex]++;
      return { ...p, counts, total: p.total + 1, myVote: optionIndex };
    }));
    await fetch(`/api/societies/${id}/polls/${pollId}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
  };

  const requestVerification = async () => {
    setRequestingVerify(true);
    const res  = await fetch(`/api/societies/${id}/verify-request`, { method: "POST" });
    const data = await res.json();
    setRequestingVerify(false);
    setVerifyToast(data.message ?? data.error ?? "Request submitted");
    setTimeout(() => setVerifyToast(""), 4000);
  };

  const createPoll = async () => {
    const validOpts = pollForm.options.filter((o) => o.trim());
    if (!pollForm.question.trim() || validOpts.length < 2) return;
    await fetch(`/api/societies/${id}/polls`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: pollForm.question, options: validOpts, endsAt: pollForm.endsAt || null }),
    });
    setShowPollForm(false);
    setPollForm({ question: "", options: ["", ""], endsAt: "" });
    load(); showToast("Poll created!");
  };

  const postRecruitment = async () => {
    if (!recruitForm.title || !recruitForm.description) return;
    await fetch(`/api/societies/${id}/recruitment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recruitForm),
    });
    setShowRecruitForm(false);
    setRecruitForm({ title: "", description: "", criteria: "", deadline: "" });
    load(); showToast("Recruitment posted!");
  };

  const applyToRecruitment = async (postingId: string) => {
    if (!applyText.trim()) return;
    const res = await fetch(`/api/societies/${id}/recruitment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", postingId, portfolioText: applyText }),
    });
    setApplyTarget(null); setApplyText("");
    if (res.ok) { load(); showToast("Application submitted anonymously!"); }
  };

  const submitEvent = async () => {
    if (!eventForm.title || !eventForm.description) return;
    setSubmittingEvent(true);
    const res = await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       eventForm.title,
        description: eventForm.description,
        type:        eventForm.type,
        organizer:   society?.name ?? "",
        deadline:    eventForm.deadline    || null,
        eventDate:   eventForm.eventDate   || null,
        link:        eventForm.link        || null,
        tags:        eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFeatured:  false,
        societyId:   id,
        isCharged:   eventForm.isCharged,
        ticketPrice: eventForm.isCharged && eventForm.ticketPrice ? parseInt(eventForm.ticketPrice) : null,
      }),
    });
    setSubmittingEvent(false);
    if (res.ok) {
      setShowEventForm(false);
      setEventForm({ title: "", description: "", type: "other", organizer: "", deadline: "", eventDate: "", link: "", tags: "", isCharged: false, ticketPrice: "" });
      showToast("Event submitted for mod review! It'll appear on the Events Hub once approved.");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <button onClick={() => router.back()} className="font-tech text-sm text-white/40 hover:text-white mb-8 flex items-center gap-2">← Back</button>
      {society && (
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display font-bold text-white text-3xl">{society.name}</h1>
                {society.verified && (
                  <span className="font-pixel text-[10px] text-emerald-400 tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    ✓ VERIFIED
                  </span>
                )}
              </div>
              {society.bio && <p className="font-tech text-sm text-white/50">{society.bio}</p>}
            </div>
            {/* Verification request — only for leader of unverified society */}
            {society.isLeader && !society.verified && (
              <button onClick={requestVerification} disabled={requestingVerify}
                className="shrink-0 px-4 py-2 rounded-xl border border-violet-500/25 bg-violet-500/8 text-violet-300 font-display font-semibold text-sm hover:bg-violet-500/12 transition-colors disabled:opacity-40">
                {requestingVerify ? "Requesting…" : "Request Verification →"}
              </button>
            )}
          </div>
          {verifyToast && (
            <p className="font-tech text-xs text-emerald-400 mt-3">{verifyToast}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["polls","recruitment","events"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl font-tech text-sm capitalize transition-all ${tab === t ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white"}`}
            style={{ background: tab === t ? undefined : "rgba(255,255,255,0.02)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Polls tab */}
      {tab === "polls" && (
        <div>
          {society?.isLeader && (
            <div className="mb-5">
              {!showPollForm ? (
                <button onClick={() => setShowPollForm(true)} className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">+ Create Poll</button>
              ) : (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 mb-4">
                  <input value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                    placeholder="Poll question" className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 mb-3" style={{ background: "rgba(255,255,255,0.03)" }} />
                  {pollForm.options.map((opt, i) => (
                    <input key={i} value={opt} onChange={(e) => { const o = [...pollForm.options]; o[i] = e.target.value; setPollForm({ ...pollForm, options: o }); }}
                      placeholder={`Option ${i+1}`} className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 mb-2" style={{ background: "rgba(255,255,255,0.03)" }} />
                  ))}
                  <button onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ""] })} className="font-tech text-xs text-violet-400 mb-3">+ Add option</button>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPollForm(false)} className="flex-1 py-2 rounded-xl border border-white/10 font-tech text-xs text-white/40">Cancel</button>
                    <button onClick={createPoll} className="flex-1 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">Post Poll</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            {polls.map((p) => {
              const maxVotes = Math.max(...p.counts, 1);
              return (
                <div key={p.id} className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <h3 className="font-display font-bold text-white text-base mb-4">{p.question}</h3>
                  <div className="space-y-2">
                    {p.options.map((opt: string, i: number) => {
                      const pct = p.total > 0 ? Math.round((p.counts[i] / p.total) * 100) : 0;
                      const voted = p.myVote === i;
                      return (
                        <button key={i} onClick={() => p.myVote === null && votePoll(p.id, i)}
                          disabled={p.myVote !== null}
                          className={`w-full text-left rounded-xl border transition-all relative overflow-hidden ${voted ? "border-violet-500/50" : "border-white/8 hover:border-white/15"}`}
                          style={{ background: voted ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)" }}>
                          {p.myVote !== null && (
                            <div className="absolute left-0 top-0 bottom-0 rounded-xl transition-all"
                              style={{ width: `${pct}%`, background: voted ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.04)" }} />
                          )}
                          <div className="relative flex items-center justify-between px-4 py-3">
                            <span className="font-tech text-sm text-white">{opt}</span>
                            {p.myVote !== null && <span className="font-tech text-xs text-white/50">{pct}% ({p.counts[i]})</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-tech text-xs text-white/30 mt-3">{p.total} vote{p.total !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
            {polls.length === 0 && <p className="font-tech text-sm text-white/40 text-center py-8">No polls yet.</p>}
          </div>
        </div>
      )}

      {/* Recruitment tab */}
      {tab === "recruitment" && (
        <div>
          {society?.isLeader && (
            <div className="mb-5">
              {!showRecruitForm ? (
                <button onClick={() => setShowRecruitForm(true)} className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">+ Post Recruitment</button>
              ) : (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 mb-4">
                  {[["Title", "title", "e.g. Graphic Designer for Techfest"], ["Description", "description", "What will they do?"], ["Criteria (optional)", "criteria", "Skills, experience needed"]].map(([label, key, ph]) => (
                    <div key={key} className="mb-3">
                      <label className="font-tech text-xs text-white/40 block mb-1">{label}</label>
                      <input value={(recruitForm as Record<string,string>)[key]} onChange={(e) => setRecruitForm({ ...recruitForm, [key]: e.target.value })}
                        placeholder={ph} className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => setShowRecruitForm(false)} className="flex-1 py-2 rounded-xl border border-white/10 font-tech text-xs text-white/40">Cancel</button>
                    <button onClick={postRecruitment} className="flex-1 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">Post</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3">
            {recruitment.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                <h3 className="font-display font-bold text-white text-base mb-2">{r.title}</h3>
                <p className="font-tech text-sm text-white/60 leading-relaxed mb-2">{r.description}</p>
                {r.criteria && <p className="font-tech text-xs text-white/40 mb-3">Criteria: {r.criteria}</p>}
                {r.deadline && <p className="font-tech text-xs text-amber-400 mb-3">Deadline: {new Date(r.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
                {!r.myStatus && !society?.isLeader && (
                  applyTarget === r.id ? (
                    <div>
                      <p className="font-tech text-xs text-white/40 mb-2">Anonymous portfolio — your real name not shown until accepted.</p>
                      <textarea value={applyText} onChange={(e) => setApplyText(e.target.value)}
                        placeholder="Share your relevant work, skills, and why you're interested…" rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 mb-2" style={{ background: "rgba(255,255,255,0.03)" }} />
                      <div className="flex gap-2">
                        <button onClick={() => setApplyTarget(null)} className="flex-1 py-2 rounded-lg font-tech text-xs text-white/40 border border-white/10">Cancel</button>
                        <button onClick={() => applyToRecruitment(r.id)} disabled={!applyText.trim()} className="flex-1 py-2 rounded-lg btn-primary text-white font-display font-semibold text-xs disabled:opacity-40">Submit (Anonymous)</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setApplyTarget(r.id)} className="px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">Apply Anonymously →</button>
                  )
                )}
                {r.myStatus && <span className={`font-tech text-xs ${r.myStatus === "accepted" ? "text-emerald-400" : r.myStatus === "rejected" ? "text-red-400" : "text-amber-400"}`}>
                  {r.myStatus === "accepted" ? "✓ Accepted" : r.myStatus === "rejected" ? "✗ Not selected" : "Applied — pending review"}
                </span>}
              </div>
            ))}
            {recruitment.length === 0 && <p className="font-tech text-sm text-white/40 text-center py-8">No open recruitment.</p>}
          </div>
        </div>
      )}

      {/* ── Events tab ── */}
      {tab === "events" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-display font-semibold text-white text-base">Submit an Event</p>
              <p className="font-tech text-xs text-white/40 mt-0.5">
                Submitted events go to mod review. If approved, they appear on the public Events Hub.
              </p>
            </div>
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
              + Submit Event
            </button>
          </div>

          {showEventForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-5">
              <div className="space-y-3">
                <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Event title *"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Describe the event *" rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                <div className="grid grid-cols-2 gap-3">
                  {([["Event Date", "eventDate"], ["Registration Deadline", "deadline"]] as [string, "eventDate"|"deadline"][]).map(([label, key]) => (
                    <div key={key}>
                      <label className="font-tech text-xs text-white/40 block mb-1">{label}</label>
                      <input type="date" value={eventForm[key]}
                        onChange={(e) => setEventForm({ ...eventForm, [key]: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-surface" />
                    </div>
                  ))}
                </div>
                <input value={eventForm.link} onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })}
                  placeholder="Registration link (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                <input value={eventForm.tags} onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                  placeholder="Tags, comma-separated (e.g. Tech, Workshop)"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />

                {/* Charged event toggle */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <input type="checkbox" id="isCharged" checked={eventForm.isCharged}
                    onChange={(e) => setEventForm({ ...eventForm, isCharged: e.target.checked })}
                    className="w-4 h-4 rounded accent-violet-500" />
                  <label htmlFor="isCharged" className="font-tech text-sm text-white/70 cursor-pointer flex-1">
                    This is a paid/ticketed event
                  </label>
                </div>
                {eventForm.isCharged && (
                  <input type="number" value={eventForm.ticketPrice}
                    onChange={(e) => setEventForm({ ...eventForm, ticketPrice: e.target.value })}
                    placeholder="Ticket price (₹)"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                )}

                <div className="rounded-xl p-3 border border-amber-500/15 bg-amber-500/5">
                  <p className="font-tech text-xs text-amber-300 leading-relaxed">
                    ⚡ Your event will be reviewed by our moderators before appearing publicly.
                    They can approve as Featured or Standard. Approval usually takes under 24 hours.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowEventForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                  <button onClick={submitEvent} disabled={!eventForm.title || !eventForm.description || submittingEvent}
                    className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                    {submittingEvent ? "Submitting…" : "Submit for Review →"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {!showEventForm && (
            <div className="rounded-2xl border border-white/8 p-8 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-3xl mb-2">📅</p>
              <p className="font-display font-semibold text-white/60 text-lg mb-1">Submit your society events</p>
              <p className="font-tech text-sm text-white/40">
                Approved events appear on the public Events Hub. Mods can mark them as Featured.
              </p>
            </div>
          )}
        </div>
      )}

      {toast && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-2xl" style={{ backdropFilter: "blur(12px)" }}>
          <span className="text-emerald-400">✓</span>
          <span className="font-display font-semibold text-white text-sm">{toast}</span>
        </motion.div>
      )}
    </div>
  );
}
