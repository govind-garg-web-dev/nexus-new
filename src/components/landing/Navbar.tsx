"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Trust", href: "#trust" },
  { label: "Community", href: "#community" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="py-5 bg-transparent"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="group">
          <img src="/logo.png" alt="MatchBatch" className="h-20 w-auto group-hover:opacity-90 transition-opacity" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-tech text-[11px] uppercase tracking-[0.18em] text-[#6666aa] hover:text-white transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <motion.a
            href="/sign-in"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl glass border border-white/[0.1] hover:border-white/[0.2] text-white/80 hover:text-white text-sm font-display font-semibold transition-all duration-200"
          >
            Sign In
          </motion.a>
          <motion.a
            href="#waitlist"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-white text-sm font-display font-semibold"
          >
            <span className="font-pixel text-xs tracking-widest">→</span>
            Join Waitlist
          </motion.a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-1"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-px bg-white/70 transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-px bg-white/70 transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-px bg-white/70 transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass border-t border-white/[0.06] px-6 py-4 flex flex-col gap-4"
        >
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="font-tech text-xs uppercase tracking-widest text-[#8888aa] hover:text-white transition-colors py-1"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/sign-in"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl glass border border-white/[0.12] text-white text-sm font-display font-semibold"
          >
            Sign In
          </a>
          <a
            href="#waitlist"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl btn-primary text-white text-sm font-display font-semibold"
          >
            Join Waitlist
          </a>
        </motion.div>
      )}
    </motion.header>
  );
}
