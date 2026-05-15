"use client";

import { motion } from "framer-motion";

const cols = [
  {
    heading: "Product",
    links: ["Features", "How it Works", "Trust Layer", "Roadmap"],
  },
  {
    heading: "Community",
    links: ["Find Teammates", "Roommates", "Academic Vault", "Mental Health"],
  },
  {
    heading: "Company",
    links: ["About", "Blog", "Privacy Policy", "Terms of Use"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] pt-16 pb-10 px-6">
      {/* Top faint glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(124,58,237,0.4), transparent)" }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img src="/logo.png" alt="MatchBatch" className="h-18 w-auto" />
            </div>
            <p className="text-[#5a5a7a] text-sm leading-relaxed font-tech mb-5">
              The anonymous, merit-based network for Indian college students.
            </p>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: "pulse-dot 2.5s ease-in-out infinite" }}
              />
              <span className="font-pixel text-[11px] text-emerald-500 tracking-widest">IN DEVELOPMENT</span>
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <h4 className="font-pixel text-[11px] tracking-[0.25em] text-[#5a5a7a] mb-4">
                {col.heading.toUpperCase()}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href={link === "Sign In" ? "/sign-in" : link === "Join Waitlist" ? "#waitlist" : "#"}
                      className={`font-tech text-xs transition-colors duration-200 ${
                        link === "Sign In"
                          ? "text-violet-400 hover:text-violet-300"
                          : "text-[#5a5a7a] hover:text-white"
                      }`}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-tech text-[11px] text-[#3a3a5a] tracking-wide">
            © 2026 MatchBatch. Built for India&apos;s students.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[11px] text-[#3a3a5a] tracking-widest">CRAFTED WITH</span>
            <span className="font-script text-violet-400 text-base">love</span>
            <span className="font-pixel text-[11px] text-[#3a3a5a] tracking-widest">& NEXT.JS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
