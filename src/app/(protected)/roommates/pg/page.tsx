"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Listing = {
  id: string; title: string; location: string; area: string | null;
  rent_per_month: number; slots_available: number; gender_pref: string;
  amenities: string[]; description: string | null; created_at: string;
  photo_urls: string[]; poster_id: string;
  poster: { pseudonym: string; avatar_color: string } | null;
};

const AMENITIES_LIST = ["WiFi", "AC", "Geyser", "Washing Machine", "Parking", "Gym", "24h Security", "Meals", "Furnished"];
const GENDER_LABEL: Record<string, string> = { male: "Male only", female: "Female only", any: "Any gender" };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function PGListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState("");
  const [form, setForm] = useState({
    title: "", location: "", area: "", rentPerMonth: "",
    slotsAvailable: "1", genderPref: "any", amenities: [] as string[], description: "",
  });
  const [photos, setPhotos]       = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    const res  = await fetch("/api/roommates/pg");
    const data = await res.json();
    setListings(data.listings ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const submit = async () => {
    if (!form.title || !form.location || !form.rentPerMonth) return;
    setSubmitting(true);

    // Upload photos first if any
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      setUploading(true);
      const fd = new FormData();
      photos.forEach((f) => fd.append("photos", f));
      const upRes = await fetch("/api/roommates/pg/photos", { method: "POST", body: fd });
      if (upRes.ok) {
        const d = await upRes.json();
        photoUrls = d.urls ?? [];
      }
      setUploading(false);
    }

    const res = await fetch("/api/roommates/pg", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, location: form.location, area: form.area || null,
        rentPerMonth: parseInt(form.rentPerMonth), slotsAvailable: parseInt(form.slotsAvailable),
        genderPref: form.genderPref, amenities: form.amenities,
        description: form.description || null,
        photoUrls,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", location: "", area: "", rentPerMonth: "", slotsAvailable: "1", genderPref: "any", amenities: [], description: "" });
      load();
      showToast("Listing posted!");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/roommates" className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Roommates</Link>
          </div>
          <h1 className="font-display font-bold text-white text-3xl mb-1">
            PG & Off-Campus <span className="font-script italic gradient-text">Listings</span>
          </h1>
          <p className="font-tech text-sm text-white/40">Campus-verified tenants only · No unverified strangers</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Post Listing
        </button>
      </div>

      {/* Post form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
            <p className="font-display font-semibold text-white text-sm mb-4">Post a PG / Flat Listing</p>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 2BHK flat near Kothrud, looking for flatmate"
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Location / address"
                  className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
                <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Neighbourhood (e.g. Kothrud)"
                  className="px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Rent (₹/month) *</label>
                  <input type="number" value={form.rentPerMonth} onChange={(e) => setForm({ ...form, rentPerMonth: e.target.value })}
                    placeholder="8000"
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none bg-transparent" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Slots</label>
                  <input type="number" min={1} max={5} value={form.slotsAvailable} onChange={(e) => setForm({ ...form, slotsAvailable: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-transparent" />
                </div>
                <div>
                  <label className="font-tech text-xs text-white/40 block mb-1">Gender</label>
                  <select value={form.genderPref} onChange={(e) => setForm({ ...form, genderPref: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white font-tech text-sm focus:outline-none bg-[#0d0d1a]">
                    <option value="any">Any</option><option value="male">Male</option><option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-tech text-xs text-white/40 block mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES_LIST.map((a) => (
                    <button key={a} onClick={() => toggleAmenity(a)}
                      className={`px-3 py-1.5 rounded-lg font-tech text-xs transition-all ${
                        form.amenities.includes(a) ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/50 hover:text-white"
                      }`}
                      style={{ background: form.amenities.includes(a) ? undefined : "rgba(255,255,255,0.02)" }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Any extra details — house rules, utilities included, distance from college…"
                rows={2} className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40" style={{ background: "rgba(255,255,255,0.03)" }} />

              {/* Photo upload — optional */}
              <div>
                <label className="font-tech text-xs text-white/50 font-semibold block mb-2">
                  Photos <span className="text-white/30 font-normal">(optional, up to 4)</span>
                </label>
                <div
                  onClick={() => document.getElementById("pg-photos-input")?.click()}
                  className="rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/30 px-4 py-3 cursor-pointer transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <input
                    id="pg-photos-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).slice(0, 4);
                      setPhotos(files);
                    }}
                  />
                  {photos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {photos.map((f, i) => (
                        <span key={i} className="font-tech text-xs text-white/60 px-2 py-1 rounded bg-white/5">
                          {f.name.slice(0, 20)}…
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-tech text-xs text-white/30 text-center">
                      📷 Click to add photos — JPEG, PNG · max 5MB each
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 font-tech text-sm text-white/40">Cancel</button>
                <button onClick={submit} disabled={!form.title || !form.location || !form.rentPerMonth || submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40">
                  {uploading ? "Uploading photos…" : submitting ? "Posting…" : "Post Listing →"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listings */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-4xl mb-3">🏠</p>
          <p className="font-display font-semibold text-white/60 text-xl mb-2">No listings yet</p>
          <p className="font-tech text-sm text-white/40">Be the first to post a PG or flat listing for campus students.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              {/* Photo strip */}
              {l.photo_urls?.length > 0 && (
                <div className="flex gap-1 h-40 overflow-hidden">
                  {l.photo_urls.slice(0, 3).map((url, pi) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={pi} src={url} alt="PG photo"
                      className={`object-cover h-full ${l.photo_urls.length === 1 ? "w-full" : pi === 0 ? "w-1/2" : "flex-1"}`} />
                  ))}
                </div>
              )}
              <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-white text-base mb-1">{l.title}</h3>
                  <p className="font-tech text-sm text-white/50">{l.location}{l.area ? ` · ${l.area}` : ""}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display font-bold text-white text-xl">₹{l.rent_per_month.toLocaleString()}</p>
                  <p className="font-tech text-xs text-white/40">per month</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
                <span className={`font-tech px-2 py-0.5 rounded border ${l.gender_pref === "any" ? "border-white/8 text-white/40" : "border-amber-500/25 text-amber-400"}`}>
                  {GENDER_LABEL[l.gender_pref]}
                </span>
                <span className="font-tech text-white/40">{l.slots_available} slot{l.slots_available !== 1 ? "s" : ""}</span>
                {l.amenities.map((a) => (
                  <span key={a} className="font-tech text-white/30 px-2 py-0.5 rounded border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>{a}</span>
                ))}
              </div>

              {l.description && <p className="font-tech text-sm text-white/50 leading-relaxed mb-3">{l.description}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center font-display font-bold text-xs text-white"
                    style={{ backgroundColor: l.poster?.avatar_color ?? "#7c3aed" }}>
                    {l.poster?.pseudonym[0].toUpperCase() ?? "?"}
                  </div>
                  <span className="font-tech text-xs text-white/30">{l.poster?.pseudonym} · {timeAgo(l.created_at)}</span>
                </div>
                <button
                  onClick={() => {
                    // Express interest — use the feed like flow
                    fetch("/api/feed/like", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ targetId: l.poster_id, intent: "roommate" }),
                    }).then(() => alert("Interest sent! They'll be notified."));
                  }}
                  className="px-4 py-2 rounded-xl btn-primary text-white font-display font-semibold text-sm">
                  Express Interest →
                </button>
              </div>
              </div>{/* close p-5 */}
            </motion.div>
          ))}
        </div>
      )}

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
