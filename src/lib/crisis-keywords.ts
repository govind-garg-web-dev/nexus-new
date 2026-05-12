// ── Crisis keywords ────────────────────────────────────────
// Triggers helpline overlay. Never blocks the message.
// Checked client-side (instant) and server-side (for flagging).
export const CRISIS_KEYWORDS: string[] = [
  // Direct suicide references
  "suicide", "suicidal", "kill myself", "killing myself",
  "end my life", "end it all", "take my life",
  "want to die", "wish i was dead", "wish i were dead",
  "better off dead", "better off without me",
  "no reason to live", "nothing to live for",
  // Self-harm
  "cutting myself", "cut myself", "hurt myself",
  "self harm", "self-harm", "self harming",
  // Hopelessness / goodbye
  "can't go on", "cant go on", "cannot go on",
  "can't take it anymore", "cant take it anymore",
  "goodbye forever", "final goodbye", "last message",
  "no way out", "nobody cares", "nobody would miss me",
  // Hindi transliterations
  "aatmahatya", "khatam karna chahta", "jeena nahi chahta",
  "mar jaana chahta", "marna chahta",
];

// ── Profanity / threat keywords ────────────────────────────
// Flags message to mod queue (does NOT block sending).
export const THREAT_KEYWORDS: string[] = [
  "i will kill you", "gonna kill you", "will hurt you",
  "i will hurt you", "going to hurt you",
  "i know where you live", "i know where you are",
  "rape", "molest",
  "send nudes", "send pics",
  "leak your photos", "expose you",
];

// ── Helpline numbers ───────────────────────────────────────
export const HELPLINES = [
  { name: "iCall (TISS)",         number: "9152987821",  hours: "Mon–Sat, 8AM–10PM" },
  { name: "Vandrevala Foundation", number: "1860-2662-345", hours: "24/7" },
  { name: "AASRA",                number: "9820466627",  hours: "24/7" },
  { name: "iCall WhatsApp",       number: "9152987821",  hours: "Text anytime" },
];

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

export function detectThreat(text: string): string | null {
  const lower = text.toLowerCase();
  const matched = THREAT_KEYWORDS.find((kw) => lower.includes(kw.toLowerCase()));
  return matched ?? null;
}
