"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Review = {
  id: string; course_code: string; course_name: string; professor_name: string;
  year_taken: number | null; clarity: number | null; fairness: number | null;
  difficulty: number | null; attendance_req: number | null; review_text: string | null;
  created_at: string;
};

function Stars({ value, max = 5 }: { value: number | null; max?: number }) {
  if (!value) return <span className="font-tech text-xs text-white/30">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: i < value ? "#a855f7" : "rgba(255,255,255,0.1)" }} />
      ))}
    </div>
  );
}

function ReviewForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    courseCode: "", courseName: "", professorName: "",
    yearTaken: "", clarity: 0, fairness: 0, difficulty: 0, attendanceReq: 0, reviewText: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const RatingRow = ({ label, field }: { label: string; field: "clarity" | "fairness" | "difficulty" | "attendanceReq" }) => (
    <div className="flex items-center justify-between">
      <span className="font-tech text-sm text-white/60 w-36">{label}</span>
      <div className="flex gap-2">
        {[1,2,3,4,5].map((v) => (
          <button key={v} onClick={() => setForm({ ...form, [field]: v })}
            className={`w-8 h-8 rounded-lg font-tech text-sm transition-all ${
              form[field] >= v ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/30 hover:text-white"
            }`}
            style={{ background: form[field] >= v ? undefined : "rgba(255,255,255,0.02)" }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  const submit = async () => {
    if (!form.courseCode || !form.courseName || !form.professorName) {
      setError("Course code, name, and professor name are required."); return;
    }
    setSubmitting(true);
    const res  = await fetch("/api/vault/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, yearTaken: form.yearTaken ? parseInt(form.yearTaken) : null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    onSuccess();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 overflow-y-auto max-h-[85vh]"
        style={{ background: "#0d0d1a" }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-white text-xl">Add Review</h2>
            <button onClick={onClose} className="font-pixel text-white/40 hover:text-white text-lg">✕</button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([["Course Code", "courseCode", "CS301"], ["Course Name", "courseName", "Operating Systems"]] as [string,string,string][]).map(([label, field, ph]) => (
                <div key={field}>
                  <label className="font-tech text-xs text-white/40 block mb-1">{label}</label>
                  <input value={field === "courseCode" ? form.courseCode : form.courseName} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={ph}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              ))}
            </div>

            <div>
              <label className="font-tech text-xs text-white/40 block mb-1">Professor Name</label>
              <input value={form.professorName} onChange={(e) => setForm({ ...form, professorName: e.target.value })}
                placeholder="Prof. R. Sharma"
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }} />
            </div>
            <div className="space-y-3 p-4 rounded-xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="font-tech text-xs text-white/40 mb-2">Ratings (1=low, 5=high)</p>
              <RatingRow label="Clarity" field="clarity" />
              <RatingRow label="Fairness" field="fairness" />
              <RatingRow label="Difficulty" field="difficulty" />
              <RatingRow label="Attendance req." field="attendanceReq" />
            </div>
            <div>
              <label className="font-tech text-xs text-white/40 block mb-1">Review (optional)</label>
              <textarea value={form.reviewText} onChange={(e) => setForm({ ...form, reviewText: e.target.value })}
                placeholder="Anything future students should know…" rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }} />
            </div>
            {error && <p className="font-tech text-xs text-red-400">{error}</p>}
            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl btn-primary text-white font-display font-semibold disabled:opacity-40">
              {submitting ? "Submitting…" : "Submit Review →"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async (q = "") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("course", q);
    const res = await fetch(`/api/vault/reviews?${params}`);
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-tech text-sm text-white/50 mb-1">Academic Vault</p>
          <h1 className="font-display font-bold text-white text-3xl mb-1">
            Professor &{" "}
            <span className="font-script italic gradient-text">Course Reviews</span>
          </h1>
          <p className="font-tech text-sm text-white/40">Anonymous · By verified students · Time-stamped</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          + Add Review
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          placeholder="Search by course name or code…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
          style={{ background: "rgba(255,255,255,0.03)" }} />
        <button onClick={() => load(search)}
          className="px-5 py-2.5 rounded-xl btn-primary text-white font-display font-semibold text-sm">
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-display font-semibold text-white/60 text-lg mb-2">No reviews yet</p>
          <p className="font-tech text-sm text-white/40">Be the first to review a professor or course.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-display font-bold text-white text-base">{r.professor_name}</p>
                  <p className="font-tech text-sm text-white/50">{r.course_name} {r.course_code && `· ${r.course_code}`}</p>
                  {r.year_taken && <p className="font-tech text-xs text-white/30 mt-0.5">Taken in {r.year_taken}</p>}
                </div>
                <p className="font-tech text-xs text-white/30 shrink-0">
                  {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[["Clarity", r.clarity], ["Fairness", r.fairness], ["Difficulty", r.difficulty], ["Attendance", r.attendance_req]].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <span className="font-tech text-xs text-white/40 w-20">{label}</span>
                    <Stars value={val as number | null} />
                  </div>
                ))}
              </div>
              {r.review_text && (
                <p className="font-tech text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3">
                  "{r.review_text}"
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ReviewForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
