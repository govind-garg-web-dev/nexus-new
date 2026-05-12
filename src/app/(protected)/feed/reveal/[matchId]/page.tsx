"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type RevealData = {
  userA: { name: string; email: string; avatarUrl: string | null };
  userB: { name: string; email: string; avatarUrl: string | null };
};

type MatchInfo = {
  id: string;
  status: string;
  icebreakerQuestion: string;
  myAnswer: string | null;
  other: { pseudonym: string; avatar_color: string };
};

function CountdownReveal({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) { onDone(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <p className="font-tech text-sm text-white/50 mb-8 tracking-widest">REVEALING IN</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="font-display font-black gradient-text"
          style={{ fontSize: "clamp(6rem, 20vw, 10rem)", lineHeight: 1 }}
        >
          {count}
        </motion.div>
      </AnimatePresence>
      <p className="font-tech text-xs text-white/30 mt-8">Both of you will see each other at the same moment</p>
    </div>
  );
}

function RevealScreen({ data, match, matchId }: { data: RevealData; match: MatchInfo; matchId: string }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 60%)" }}
      />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-10 mb-6"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-display font-black text-white mb-2" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>
          Meet{" "}
          <span className="font-script italic gradient-text">{data.userB.name.split(" ")[0]}</span>!
        </h1>
        <p className="font-tech text-sm text-white/50">
          Formerly known as <span className="text-white">{match.other.pseudonym}</span>
        </p>
      </motion.div>

      {/* Their identity card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 rounded-3xl border border-violet-500/20 p-8 w-full max-w-sm mb-6"
        style={{ background: "rgba(124,58,237,0.08)" }}
      >
        {data.userB.avatarUrl ? (
          <Image
            src={data.userB.avatarUrl}
            alt={data.userB.name}
            width={72}
            height={72}
            className="w-18 h-18 rounded-2xl mx-auto mb-4"
          />
        ) : (
          <div
            className="w-18 h-18 rounded-2xl flex items-center justify-center font-display font-black text-3xl text-white mx-auto mb-4"
            style={{ backgroundColor: match.other.avatar_color, width: 72, height: 72 }}
          >
            {data.userB.name[0].toUpperCase()}
          </div>
        )}

        <h2 className="font-display font-bold text-white text-2xl mb-1">{data.userB.name}</h2>
        <p className="font-tech text-sm text-white/50 mb-4">{data.userB.email}</p>

        {/* Their answer to the icebreaker */}
        <div className="rounded-xl p-4 border border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="font-tech text-xs text-white/40 mb-2">Their answer to the icebreaker:</p>
          <p className="font-tech text-sm text-white/80 leading-relaxed italic">
            "{match.myAnswer}"
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex flex-col gap-3 w-full max-w-sm"
      >
        <Link
          href={`/chat/${matchId}`}
          className="w-full py-4 rounded-2xl btn-primary text-white font-display font-bold text-lg text-center block"
        >
          Start Chatting 💬
        </Link>
        <button
          onClick={() => router.push("/feed/matches")}
          className="font-tech text-sm text-white/40 hover:text-white transition-colors py-2"
        >
          Back to Matches
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function RevealPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch]         = useState<MatchInfo | null>(null);
  const [revealed, setRevealed]   = useState<RevealData | null>(null);
  const [counting, setCounting]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.matches ?? []).find((m: { id: string }) => m.id === matchId);
        setMatch(found ?? null);
        setLoading(false);
        // If already revealed, fetch identity data immediately
        if (found?.status === "revealed") fetchReveal();
        else if (found?.status === "icebreaker_completed") setCounting(true);
      });
  }, [matchId]);

  const fetchReveal = async () => {
    const res  = await fetch("/api/reveal", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ matchId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not reveal identity.");
      return;
    }
    const data = await res.json();
    setRevealed(data);
  };

  const handleCountdownDone = () => {
    setCounting(false);
    fetchReveal();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!match) return (
    <div className="text-center p-10">
      <p className="font-tech text-white/60">Match not found or not ready to reveal.</p>
    </div>
  );

  if (error) return (
    <div className="text-center p-10 max-w-sm mx-auto">
      <p className="font-tech text-red-400 mb-4">{error}</p>
      <button onClick={() => window.history.back()} className="font-tech text-sm text-white/40 hover:text-white">← Go back</button>
    </div>
  );

  if (counting) return <CountdownReveal onDone={handleCountdownDone} />;

  if (revealed && match) return <RevealScreen data={revealed} match={match} matchId={matchId} />;

  return (
    <div className="text-center p-10">
      <p className="font-tech text-white/60">Loading…</p>
    </div>
  );
}
