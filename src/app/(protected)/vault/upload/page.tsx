"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import CustomSelect from "@/components/ui/CustomSelect";

const BRANCHES_SHORT = [
  "CSE", "IT", "ECE", "EE", "ME", "CE", "CHE", "Biotech",
  "Mathematics & Computing", "Physics", "MBA", "Design", "Other",
];
const TYPES = [
  { value: "pyq",        label: "Previous Year Question Paper (PYQ)" },
  { value: "notes",      label: "Handwritten / Typed Notes" },
  { value: "lab",        label: "Lab Manual / Report" },
  { value: "assignment", label: "Assignment" },
  { value: "other",      label: "Other" },
];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => String(i + 1));
const CUR_YEAR  = new Date().getFullYear();
const YEARS     = Array.from({ length: 6 }, (_, i) => String(CUR_YEAR - i));

export default function VaultUploadPage() {
  const router = useRouter();
  const [file, setFile]           = useState<File | null>(null);
  const [title, setTitle]         = useState("");
  const [branch, setBranch]       = useState("");
  const [semester, setSemester]   = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [year, setYear]           = useState("");
  const [type, setType]           = useState("notes");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async () => {
    if (!file || !title || !branch || !courseName) {
      setError("File, title, branch, and course name are required.");
      return;
    }
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("branch", branch);
    form.append("semester", semester);
    form.append("courseCode", courseCode);
    form.append("courseName", courseName);
    form.append("year", year);
    form.append("type", type);
    form.append("description", description);

    const res  = await fetch("/api/vault", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push("/vault");
  };

  return (
    <div className="max-w-xl mx-auto p-6 lg:p-10">
      <button onClick={() => router.back()}
        className="font-tech text-sm text-white/40 hover:text-white transition-colors mb-8 flex items-center gap-2">
        ← Back to Vault
      </button>

      <h1 className="font-display font-bold text-white text-3xl mb-2">Upload to Vault</h1>
      <p className="font-tech text-sm text-white/50 mb-8">
        PDFs and images only. Text is extracted automatically from PDFs for search.
        Earn <span className="text-violet-400">+5 karma</span> per upload · Contributor badge at 10 uploads.
      </p>

      <div className="space-y-5">
        {/* File pick */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">File *</label>
          <div
            onClick={() => document.getElementById("vault-file")?.click()}
            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              file ? "border-violet-500/40 bg-violet-500/5" : "border-white/10 hover:border-violet-500/30"
            }`}
          >
            <input id="vault-file" type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="font-display font-semibold text-white text-sm mb-1">{file.name}</p>
                <p className="font-tech text-xs text-white/40">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p className="font-display font-semibold text-white/60 text-sm mb-1">Click to choose file</p>
                <p className="font-tech text-xs text-white/30">PDF, PNG, JPG, Word · max 20 MB</p>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. OS Unit 5 PYQ 2023"
            className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
        </div>

        {/* Type */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`px-3 py-2.5 rounded-xl border text-left font-tech text-xs transition-all ${
                  type === t.value ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-white/8 text-white/50 hover:text-white"
                }`}
                style={{ background: type === t.value ? undefined : "rgba(255,255,255,0.02)" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Branch + Semester */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Branch *</label>
            <CustomSelect options={BRANCHES_SHORT} value={branch} onChange={setBranch} placeholder="Select branch" />
          </div>
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Semester</label>
            <CustomSelect options={SEMESTERS.map((s) => `Sem ${s}`)} value={semester ? `Sem ${semester}` : ""}
              onChange={(v) => setSemester(v.replace("Sem ", ""))} placeholder="Select semester" />
          </div>
        </div>

        {/* Course code + name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Course Code</label>
            <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CS301"
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
          </div>
          <div>
            <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Course Name *</label>
            <input value={courseName} onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }} />
          </div>
        </div>

        {/* Year */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">Year</label>
          <div className="flex gap-2 flex-wrap">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setYear(year === y ? "" : y)}
                className={`px-3.5 py-2 rounded-lg font-tech text-sm transition-all ${
                  year === y ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "border border-white/10 text-white/50 hover:text-white"
                }`}
                style={{ background: year === y ? undefined : "rgba(255,255,255,0.02)" }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Description for search */}
        <div>
          <label className="font-tech text-xs text-white/50 font-semibold block mb-2">
            Description / Keywords
            <span className="text-white/30 ml-2 font-normal">(improves search for images and scanned PDFs)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Unit 5 covers process scheduling, deadlocks, memory management..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-white/20 font-tech text-sm resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }} />
        </div>

        {error && <p className="font-tech text-sm text-red-400">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!file || !title || !branch || !courseName || uploading}
          className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading…" : "Upload to Vault →"}
        </motion.button>
      </div>
    </div>
  );
}
