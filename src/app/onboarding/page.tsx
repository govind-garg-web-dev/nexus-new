"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getCollegeName, requiresIdVerification } from "@/lib/college-domains";
import CollegeSearch from "@/components/ui/CollegeSearch";
import CustomSelect from "@/components/ui/CustomSelect";
import { generateUsername } from "@/lib/random-username";

const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Mathematics & Computing",
  "Physics",
  "MBA / Management",
  "Design",
  "Architecture",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 3 + i);

const AVATAR_COLORS = [
  "#7c3aed", "#4f46e5", "#2563eb", "#0891b2",
  "#059669", "#d97706", "#dc2626", "#db2777",
];

// ── Step indicator ─────────────────────────────────────────
// OTP step hidden — reactivate by restoring step 1 in OnboardingPage
function StepDots({ step: _step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      <div className="h-1.5 w-8 rounded-full bg-violet-500" />
      <span className="font-pixel text-[11px] text-[#5a5a7a] tracking-widest ml-1">
        PROFILE SETUP
      </span>
    </div>
  );
}

// ── Step 1: Phone OTP ──────────────────────────────────────
function PhoneStep({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setPhase("otp");
    setCountdown(30);
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    onDone();
  };

  return (
    <div>
      <StepDots step={1} />
      <h2 className="font-display font-bold text-white text-2xl mb-1">
        Verify your number.
      </h2>
      <p className="font-tech text-xs text-[#5a5a7a] mb-8 leading-relaxed">
        One Indian mobile number per account. Used for security — never shown publicly.
      </p>

      <AnimatePresence mode="wait">
        {phase === "phone" ? (
          <motion.div key="phone" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <label className="font-pixel text-[11px] tracking-widest text-[#5a5a7a] block mb-2">
              MOBILE NUMBER
            </label>
            <div className="flex gap-3 mb-4">
              <div className="px-4 py-3.5 rounded-xl glass border border-white/[0.08] font-tech text-sm text-[#7a7a9a] shrink-0">
                +91
              </div>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                className="flex-1 px-4 py-3.5 rounded-xl glass border border-white/[0.08] text-white placeholder-[#3a3a5a] font-tech text-sm focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>
            {error && <p className="font-tech text-xs text-red-400 mb-4">{error}</p>}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={sendOtp}
              disabled={phone.length !== 10 || loading}
              className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send OTP"}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <p className="font-tech text-xs text-[#5a5a7a] mb-6">
              OTP sent to <span className="text-white">+91 {phone}</span>.{" "}
              <button onClick={() => setPhase("phone")} className="text-violet-400 hover:text-violet-300 transition-colors">
                Change
              </button>
            </p>
            <label className="font-pixel text-[11px] tracking-widest text-[#5a5a7a] block mb-2">
              ENTER OTP
            </label>
            <input
              type="tel"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              className="w-full px-4 py-3.5 rounded-xl glass border border-white/[0.08] text-white placeholder-[#3a3a5a] font-tech text-sm text-center tracking-[0.5em] focus:outline-none focus:border-violet-500/40 transition-colors mb-4"
            />
            {error && <p className="font-tech text-xs text-red-400 mb-4">{error}</p>}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={verifyOtp}
              disabled={otp.length !== 6 || loading}
              className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed mb-3"
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </motion.button>
            <button
              onClick={sendOtp}
              disabled={countdown > 0 || loading}
              className="w-full font-tech text-xs text-[#5a5a7a] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 2: Profile setup ──────────────────────────────────
function ProfileStep({ userEmail, onDone }: { userEmail: string; onDone: () => void }) {
  const domain = userEmail.split("@")[1] ?? "";
  const detectedCollege = getCollegeName(domain);

  const [pseudonym, setPseudonym] = useState(() => generateUsername());
  const [college, setCollege] = useState(detectedCollege ?? "");
  const [branch, setBranch] = useState("");
  const [batchYear, setBatchYear] = useState<number>(CURRENT_YEAR);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pseudonymAvail, setPseudonymAvail] = useState<"idle" | "checking" | "taken" | "available">("idle");

  const supabase = createClient();

  const rerollUsername = () => {
    const next = generateUsername();
    setPseudonym(next);
    checkPseudonym(next);
  };

  const checkPseudonym = async (val: string) => {
    if (val.length < 3) { setPseudonymAvail("idle"); return; }
    setPseudonymAvail("checking");
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("pseudonym", val)
      .maybeSingle();
    setPseudonymAvail(data ? "taken" : "available");
  };

  const handleSubmit = async () => {
    if (!pseudonym || !college || !branch || pseudonymAvail !== "available") return;
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please sign in again."); setLoading(false); return; }

    // Insert profile
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: user.id,
      pseudonym,
      college,
      branch,
      batch_year: batchYear,
      avatar_color: avatarColor,
    });

    if (profileErr) {
      setError(profileErr.message.includes("unique") ? "That pseudonym is taken." : profileErr.message);
      setLoading(false);
      return;
    }

    // Mark onboarding complete
    await supabase.from("users").update({ onboarding_complete: true }).eq("id", user.id);

    setLoading(false);
    onDone();
  };

  const pseudonymStatus = {
    idle: null,
    checking: <span className="text-[#5a5a7a]">Checking…</span>,
    taken: <span className="text-red-400">Already taken.</span>,
    available: <span className="text-emerald-400">Available ✓</span>,
  }[pseudonymAvail];

  return (
    <div>
      <StepDots step={2} />
      <h2 className="font-display font-bold text-white text-2xl mb-1">
        Create your{" "}
        <span className="font-script italic gradient-text">alias.</span>
      </h2>
      <p className="font-tech text-sm text-[#8888aa] mb-8 leading-relaxed">
        This is what the campus sees. Your real name stays hidden until you choose to reveal it.
      </p>

      {/* Avatar color picker */}
      <div className="mb-6">
        <label className="font-tech text-xs font-semibold text-[#8888aa] block mb-3">
          Avatar Color
        </label>
        <div className="flex gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setAvatarColor(c)}
              className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: avatarColor === c ? `2px solid ${c}` : "none",
                outlineOffset: 2,
              }}
            />
          ))}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-white text-sm ml-2 transition-all"
            style={{ backgroundColor: avatarColor, boxShadow: `0 0 12px ${avatarColor}60` }}
          >
            {pseudonym ? pseudonym[0].toUpperCase() : "?"}
          </div>
        </div>
      </div>

      {/* Pseudonym — auto-generated, re-rollable */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="font-tech text-xs font-semibold text-[#8888aa]">Your Campus Alias</label>
          <span className="font-tech text-xs">{pseudonymStatus}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/3 border border-violet-500/20">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-white text-sm shrink-0"
            style={{ backgroundColor: avatarColor, boxShadow: `0 0 8px ${avatarColor}50` }}
          >
            {pseudonym[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="flex-1 font-display font-bold text-white text-lg tracking-tight">{pseudonym}</span>
          <button
            type="button"
            onClick={rerollUsername}
            title="Generate a new name"
            className="font-pixel text-violet-400 hover:text-violet-200 transition-colors text-base px-2"
          >
            ↻
          </button>
        </div>
        <p className="font-tech text-xs text-[#5a5a7a] mt-1.5">
          Auto-generated · like Reddit · click ↻ to get a new one
        </p>
      </div>

      {/* College — searchable autocomplete */}
      <div className="mb-5">
        <label className="font-tech text-xs font-semibold text-[#8888aa] block mb-2">College</label>
        <CollegeSearch value={college} onChange={setCollege} />
        {detectedCollege && (
          <p className="font-tech text-xs text-violet-400 mt-1.5">
            ◈ Auto-detected from {domain}
          </p>
        )}
      </div>

      {/* Branch — custom dark dropdown */}
      <div className="mb-5">
        <label className="font-tech text-xs font-semibold text-[#8888aa] block mb-2">Branch</label>
        <CustomSelect
          options={BRANCHES}
          value={branch}
          onChange={setBranch}
          placeholder="Select your branch"
        />
      </div>

      {/* Batch year */}
      <div className="mb-7">
        <label className="font-tech text-xs font-semibold text-[#8888aa] block mb-3">Graduation Year</label>
        <div className="flex gap-2 flex-wrap">
          {BATCH_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setBatchYear(y)}
              className="px-3.5 py-2 rounded-lg font-tech text-sm transition-all duration-200"
              style={
                batchYear === y
                  ? { background: "#7c3aed20", border: "1px solid #7c3aed50", color: "#a78bfa" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#8888aa" }
              }
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="font-tech text-xs text-red-400 mb-4">{error}</p>}

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={!pseudonym || !college || !branch || loading}
        className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Setting up your profile…" : "Enter Nexus →"}
      </motion.button>
    </div>
  );
}

// ── Step 3: College ID verification (for non-obvious domains) ─────────────
function IdVerificationStep({ onDone }: { onDone: () => void }) {
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res  = await fetch("/api/id-verification", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">ID submitted!</h2>
        <p className="font-tech text-sm text-white/60 mb-6">
          Our team verifies within 24 hours. You can use the app in the meantime.
        </p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onDone}
          className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-bold text-base">
          Enter Nexus →
        </motion.button>
      </div>
    );
  }

  return (
    <div>
      <StepDots step={2} />
      <h2 className="font-display font-bold text-white text-2xl mb-2">
        One more thing.
      </h2>
      <p className="font-tech text-sm text-[#8888aa] mb-6 leading-relaxed">
        Your college uses a non-standard email domain. Please upload a photo of your college ID card to confirm enrollment. This is reviewed by a human — not AI.
      </p>
      <div
        onClick={() => document.getElementById("id-file-input")?.click()}
        className="rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/30 p-8 text-center cursor-pointer transition-colors mb-4"
      >
        <input id="id-file-input" type="file" accept="image/*" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div>
            <p className="font-display font-semibold text-white text-sm mb-1">{file.name}</p>
            <p className="font-tech text-xs text-white/40">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <>
            <p className="font-display font-semibold text-white/60 text-sm mb-1">Click to upload your college ID</p>
            <p className="font-tech text-xs text-white/30">JPEG, PNG · max 5 MB</p>
          </>
        )}
      </div>
      {error && <p className="font-tech text-sm text-red-400 mb-4">{error}</p>}
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={submit} disabled={!file || uploading}
        className="w-full py-3.5 rounded-xl btn-primary text-white font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed mb-3">
        {uploading ? "Uploading…" : "Submit ID →"}
      </motion.button>
      <button onClick={onDone} className="w-full font-tech text-xs text-white/30 hover:text-white/50 transition-colors py-2">
        Skip for now (you may be asked to verify later)
      </button>
    </div>
  );
}

// ── Main onboarding page ───────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/sign-in"); return; }
      setUserEmail(data.user.email ?? "");
    });
  }, [router]);

  // OTP_ENABLED = false: skip phone step, go straight to profile.
  // To re-enable: set OTP_ENABLED = true — PhoneStep and routing are fully preserved.
  const OTP_ENABLED = false;

  const handlePhoneDone   = () => setStep(2);
  const handleProfileDone = () => {
    // If the domain needs ID verification, go to the ID upload step instead
    if (userEmail && requiresIdVerification(userEmail)) {
      setStep(3); // ID upload step
    } else {
      router.replace("/dashboard");
    }
  };

  // When OTP is disabled, always show profile step
  const activeStep = OTP_ENABLED ? step : 2;

  return (
    <div className="relative min-h-screen flex items-center justify-center dot-grid overflow-hidden py-12 px-4">
      {/* Background orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "10%", left: "-10%", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
          animation: "float-orb-1 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "5%", right: "-5%", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          animation: "float-orb-2 22s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo top */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center glow-sm-violet">
            <span className="font-pixel text-white text-sm">N</span>
          </div>
          <span className="font-display font-bold text-white tracking-tight">NEXUS</span>
        </div>

        <div className="glass-strong rounded-3xl p-8 border border-white/[0.08]">
          <AnimatePresence mode="wait">
            {OTP_ENABLED && activeStep === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <PhoneStep onDone={handlePhoneDone} />
              </motion.div>
            ) : activeStep === 3 ? (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
                <IdVerificationStep onDone={() => router.replace("/dashboard")} />
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProfileStep userEmail={userEmail} onDone={handleProfileDone} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
