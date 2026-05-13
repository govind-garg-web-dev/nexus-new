"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomSelect from "@/components/ui/CustomSelect";

const TYPES = ["hackathon", "fest", "internship", "workshop", "other"];

export default function EventAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", type: "hackathon", organizer: "",
    deadline: "", eventDate: "", link: "", tags: "", isFeatured: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const submit = async () => {
    if (!form.title || !form.description) { setError("Title and description are required."); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags:      form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        deadline:  form.deadline  || null,
        eventDate: form.eventDate || null,
        link:      form.link      || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    router.push("/events");
  };

  return (
    <div className="max-w-xl mx-auto p-6 lg:p-10">
      <button onClick={() => router.back()} className="font-tech text-sm text-white/40 hover:text-white transition-colors mb-8">← Back</button>
      <h1 className="font-display font-bold text-white text-3xl mb-2">Post an Event</h1>
      <p className="font-tech text-sm text-white/50 mb-8">Admin only. Events appear in the Event Hub for all campus users.</p>

      <div className="space-y-4">
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Title *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Smart India Hackathon 2026"
            className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
        </div>

        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Type</label>
          <CustomSelect options={TYPES} value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="Select type" />
        </div>

        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is this event about? Who should participate?"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Organizer</label>
            <input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })}
              placeholder="e.g. AICTE, Devfolio"
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
          </div>
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Registration Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors bg-[#0d0d1a]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Event Date</label>
            <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors bg-[#0d0d1a]" />
          </div>
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Link</label>
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://…"
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
          </div>
        </div>

        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Tags (comma-separated)</label>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="React, ML, Open Source, Fintech"
            className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
          <input type="checkbox" id="featured" checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            className="w-4 h-4 rounded accent-violet-500" />
          <label htmlFor="featured" className="font-tech text-sm text-white/70 cursor-pointer">
            Feature this event at the top of the hub
          </label>
        </div>

        {error && <p className="font-tech text-sm text-red-400">{error}</p>}

        <button onClick={submit} disabled={!form.title || !form.description || submitting}
          className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? "Posting…" : "Publish Event →"}
        </button>
      </div>
    </div>
  );
}
