"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Course = { id: string; category: string; title: string; description: string; difficulty: string; lessons: number; duration_hrs: number; };

const DIFF_COLOR: Record<string, string> = { beginner: "#10b981", intermediate: "#f59e0b", advanced: "#ef4444" };
const DIFF_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export default function CoursesPage() {
  const [tab, setTab]       = useState<"college" | "coding">("college");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pro/courses?category=${tab}`)
      .then((r) => r.json())
      .then((d) => { setCourses(d.courses ?? []); setLoading(false); });
  }, [tab]);

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👑</span>
            <span className="font-pixel text-xs text-amber-400 tracking-widest">PRO</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl mb-1">
            Courses
          </h1>
          <p className="font-tech text-sm text-white/40">College curriculum + Coding skills — all in one place</p>
        </div>
        <Link href="/pro" className="font-tech text-sm text-white/40 hover:text-white transition-colors">← Pro Home</Link>
      </div>

      {/* Tab */}
      <div className="flex gap-3 mb-8">
        {(["college", "coding"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl font-display font-semibold text-sm capitalize transition-all ${
              tab === t ? "btn-primary text-white" : "border border-white/10 text-white/50 hover:text-white"
            }`}
            style={{ background: tab === t ? undefined : "rgba(255,255,255,0.02)" }}>
            {t === "college" ? "📚 College Courses" : "💻 Coding Courses"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/8 p-5 hover:border-white/15 transition-all group cursor-pointer"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs px-2 py-0.5 rounded"
                  style={{ color: DIFF_COLOR[c.difficulty], background: `${DIFF_COLOR[c.difficulty]}15` }}>
                  {DIFF_LABEL[c.difficulty]}
                </span>
                <span className="font-tech text-xs text-white/30">{c.duration_hrs}h</span>
              </div>
              <h3 className="font-display font-bold text-white text-base mb-2 group-hover:text-violet-200 transition-colors">{c.title}</h3>
              <p className="font-tech text-xs text-white/50 leading-relaxed mb-4 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-tech text-xs text-white/30">{c.lessons} lessons</span>
                <span className="font-tech text-xs text-violet-400 group-hover:text-violet-300 transition-colors">Enroll →</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
