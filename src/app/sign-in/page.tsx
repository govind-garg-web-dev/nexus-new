"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_domain: "Only college emails (.ac.in / .edu.in) are accepted. Personal emails are rejected.",
  auth_failed: "Authentication failed. Please try again.",
  no_code: "Something went wrong with Google sign-in. Please try again.",
};

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const customMsg = searchParams.get("msg");
  const [loading, setLoading] = useState(false);

  const errorText = customMsg
    ? decodeURIComponent(customMsg)
    : error
    ? ERROR_MESSAGES[error] ?? "An error occurred."
    : null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center dot-grid overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "15%", left: "-10%", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          animation: "float-orb-1 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "10%", right: "-10%", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          animation: "float-orb-2 22s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="glass-strong rounded-3xl p-8 border border-white/[0.08]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="MatchBatch" className="h-60 w-auto mb-4" />
            <p className="font-tech text-[11px] text-[#5a5a7a] tracking-[0.2em]">
              CAMPUS VERIFIED · MERIT FIRST
            </p>
          </div>

          {/* Error banner */}
          {errorText && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] text-center"
            >
              <p className="font-tech text-xs text-red-400 leading-relaxed">{errorText}</p>
            </motion.div>
          )}

          {/* Heading */}
          <div className="text-center mb-7">
            <h2 className="font-display font-bold text-white text-xl mb-2">
              Welcome{" "}
              <span className="font-script italic gradient-text">back.</span>
            </h2>
            <p className="font-tech text-xs text-[#5a5a7a] leading-relaxed">
              Sign in with your college Google account.
              <br />
              Personal emails are rejected at the gate.
            </p>
          </div>

          {/* Google button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl glass border border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.06] transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span className="font-display font-semibold text-white text-sm group-hover:text-violet-200 transition-colors">
              {loading ? "Redirecting to Google…" : "Continue with Google"}
            </span>
          </motion.button>

          {/* Accepted domains note */}
          <div className="mt-6 p-3.5 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
            <p className="font-pixel text-[10px] tracking-widest text-violet-400 text-center mb-2">
              ACCEPTED DOMAINS
            </p>
            <p className="font-tech text-[11px] text-[#5a5a7a] text-center leading-relaxed">
              *.ac.in · *.edu.in · IITs · NITs · BITS · IIITs
              <br />
              VIT · Manipal · PES · SRM + more
            </p>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <a
              href="/"
              className="font-tech text-[11px] text-[#4a4a6a] hover:text-white transition-colors tracking-wide"
            >
              ← Back to homepage
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
