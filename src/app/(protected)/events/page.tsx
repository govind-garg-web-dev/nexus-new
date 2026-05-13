"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Event = {
  id: string; title: string; description: string; type: string;
  organizer: string | null; deadline: string | null; event_date: string | null;
  link: string | null; tags: string[]; is_featured: boolean; created_at: string;
};

const TYPE_COLOR: Record<string, string> = {
  hackathon: "#a855f7", fest: "#f59e0b", internship: "#10b981",
  workshop: "#3b82f6", other: "#6b7280",
};
const TYPE_LABEL: Record<string, string> = {
  hackathon: "Hackathon", fest: "Fest", internship: "Internship",
  workshop: "Workshop", other: "Other",
};
const TYPE_ICON: Record<string, string> = {
  hackathon: "⚡", fest: "🎉", internship: "💼", workshop: "🛠", other: "📌",
};

function daysUntil(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0)   return "Expired";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days}d left`;
}

export default function EventsPage() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [q, setQ]             = useState("");

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("type", filter);
    if (q)      params.set("q", q);
    const res  = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const featured  = events.filter((e) => e.is_featured);
  const rest      = events.filter((e) => !e.is_featured);

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Events & Referrals</p>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Event <span className="font-script italic gradient-text">Hub</span>
          </h1>
          <p className="font-tech text-sm text-white/40">
            Hackathons · Fests · Internship deadlines · Find teammates inside each event
          </p>
        </div>
        <Link href="/events/admin"
          className="px-4 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/50 hover:text-white hover:border-white/20 transition-all"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          + Post Event
        </Link>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[{ value: "", label: "All" }, ...Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))].map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-xl font-tech text-sm transition-all ${
              filter === value ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white hover:border-white/20"
            }`}
            style={{ background: filter === value ? undefined : "rgba(255,255,255,0.02)" }}>
            {value ? `${TYPE_ICON[value]} ${label}` : "All"}
          </button>
        ))}
        {/* Search */}
        <div className="flex gap-2 ml-auto">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search events…"
            className="px-4 py-2 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
          <button onClick={load} className="px-4 py-2 rounded-xl btn-primary text-white font-tech text-sm">Go</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">📅</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No events yet</p>
          <p className="font-tech text-sm text-white/40">Events will appear here once the admin posts them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Featured */}
          {featured.map((e, i) => <EventCard key={e.id} event={e} index={i} featured />)}
          {/* Rest */}
          {rest.map((e, i) => <EventCard key={e.id} event={e} index={featured.length + i} featured={false} />)}
        </div>
      )}
    </div>
  );
}

function EventCard({ event: e, index, featured }: { event: Event; index: number; featured: boolean }) {
  const color    = TYPE_COLOR[e.type] ?? "#6b7280";
  const deadline = daysUntil(e.deadline);
  const urgent   = e.deadline && new Date(e.deadline).getTime() - Date.now() < 3 * 86400000;

  return (
    <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border overflow-hidden ${featured ? "border-violet-500/25" : "border-white/8"}`}
      style={{ background: featured ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)" }}>
      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          {TYPE_ICON[e.type]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {featured && (
              <span className="font-pixel text-[10px] tracking-widest text-violet-300 px-2 py-0.5 rounded"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                FEATURED
              </span>
            )}
            <span className="font-tech text-xs px-2 py-0.5 rounded"
              style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}>
              {TYPE_LABEL[e.type]}
            </span>
            {e.organizer && <span className="font-tech text-xs text-white/40">{e.organizer}</span>}
          </div>

          <h3 className="font-display font-bold text-white text-lg mb-1">{e.title}</h3>
          <p className="font-tech text-sm text-white/50 leading-relaxed line-clamp-2 mb-3">{e.description}</p>

          {/* Tags */}
          {e.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {e.tags.map((t) => (
                <span key={t} className="font-tech text-xs text-white/30 px-2 py-0.5 rounded border border-white/8"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Deadline + links */}
          <div className="flex items-center gap-4 flex-wrap">
            {e.deadline && (
              <span className={`font-tech text-xs font-semibold ${urgent ? "text-red-400" : "text-white/50"}`}>
                ⏰ {urgent ? "URGENT — " : ""}{deadline} · {new Date(e.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
            {e.link && (
              <a href={e.link} target="_blank" rel="noopener noreferrer"
                className="font-tech text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Register ↗
              </a>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link href={`/events/${e.id}`}
          className="shrink-0 px-4 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm whitespace-nowrap">
          Find Team →
        </Link>
      </div>
    </motion.div>
  );
}
