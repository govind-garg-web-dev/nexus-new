type Question = { q: string; category: string[] };

// 60 curated icebreaker questions grouped by theme.
// category[] maps to badge categories so we can pick the most relevant one.
const QUESTIONS: Question[] = [
  // ── Tech / Building ───────────────────────────────────────
  { q: "You have 48 hours and one teammate. What do you build — and what's the one feature you absolutely ship?", category: ["coding", "design"] },
  { q: "What's the most elegant piece of code or design you've seen? What made it click?", category: ["coding", "design"] },
  { q: "If you had to delete one programming language from existence, which one and why?", category: ["coding"] },
  { q: "What's a technical problem you solved recently that you're quietly proud of?", category: ["coding"] },
  { q: "Tabs or spaces? Dark mode or light mode? Vim or VS Code? Defend all three.", category: ["coding"] },
  { q: "Describe your ideal development environment — tools, music, time of day, everything.", category: ["coding"] },
  { q: "What's the worst bug you've ever hunted? How long did it take?", category: ["coding"] },
  { q: "You're designing an app from scratch for your campus. What's the first screen you design and why?", category: ["design"] },
  { q: "What UI makes you irrationally happy every time you use it?", category: ["design"] },
  { q: "If you had to reduce your favourite app to just one screen, which app and which screen?", category: ["design"] },

  // ── Startup / Co-founder thinking ─────────────────────────
  { q: "What's a problem you've personally experienced on campus that nobody has built a solution for?", category: ["co_founder", "general"] },
  { q: "Name one startup idea you're 80% sure would work — and the reason you haven't started it yet.", category: ["co_founder"] },
  { q: "What's the difference between a feature and a product? Give an example from something you've built.", category: ["co_founder", "coding"] },
  { q: "What would make you leave a safe placement offer to build a startup full-time?", category: ["co_founder"] },
  { q: "Describe the founder you'd most want to work with — not their skills, but their operating style.", category: ["co_founder"] },

  // ── DSA / Problem solving ─────────────────────────────────
  { q: "What's the most counterintuitive algorithm or data structure you've learned? Why does it work?", category: ["quiz", "coding"] },
  { q: "Is competitive programming useful for real-world engineering? Make the strongest case for the losing side.", category: ["quiz", "coding"] },
  { q: "If you had to explain recursion to a 10-year-old using only things in a kitchen, how would you do it?", category: ["quiz"] },
  { q: "What's a real-world system that you now understand differently after studying algorithms?", category: ["quiz", "coding"] },
  { q: "Time complexity vs. space complexity — when does each actually matter in production?", category: ["quiz"] },

  // ── Writing / Communication ───────────────────────────────
  { q: "Pitch your favourite open-source project to a non-technical friend in exactly 3 sentences.", category: ["writing"] },
  { q: "Write the first sentence of your startup's About page — right now, off the top of your head.", category: ["writing", "co_founder"] },
  { q: "What's something technical you had to explain recently? What analogy finally made it land?", category: ["writing", "coding"] },
  { q: "If you had to write a blog post that got shared 10,000 times, what would the headline be?", category: ["writing"] },
  { q: "Explain the project you're most proud of in one tweet (280 characters). Go.", category: ["writing"] },

  // ── Career / Internships ──────────────────────────────────
  { q: "What's the one line in your resume that actually represents who you are — not what looks good?", category: ["general"] },
  { q: "Describe your dream first job out of college. Not the company — the day-to-day work.", category: ["general"] },
  { q: "What's the biggest difference between how you thought the tech industry worked versus how it actually does?", category: ["general"] },
  { q: "If referrals are about relationships, not just resumes — how would you build a relationship with someone you admire in 3 steps?", category: ["general"] },
  { q: "What skill are you deliberately building right now that isn't obvious from your branch?", category: ["general"] },

  // ── Campus / College life ─────────────────────────────────
  { q: "What's the most useful thing you've learned in college that wasn't in any course?", category: ["general"] },
  { q: "Describe your most productive semester versus your least. What made the difference?", category: ["general"] },
  { q: "What would you tell a first-year student on day one that nobody told you?", category: ["general"] },
  { q: "If you had to design your college's curriculum for tech students from scratch, what would you cut and what would you add?", category: ["general", "quiz"] },
  { q: "What's one thing about your college's culture — good or bad — that shaped how you think?", category: ["general"] },

  // ── Collaboration / Teamwork ──────────────────────────────
  { q: "Describe the best team you've been part of. What made it work?", category: ["general"] },
  { q: "What role do you naturally fall into on a team — and is it the role you actually want?", category: ["general"] },
  { q: "A teammate ships broken code 30 minutes before a deadline. What do you do?", category: ["coding", "general"] },
  { q: "What's your communication style when you disagree with a technical decision?", category: ["general"] },
  { q: "How do you handle a teammate who doesn't pull their weight without making it awkward?", category: ["general"] },

  // ── Ambition / Philosophy ─────────────────────────────────
  { q: "What would you build if you knew it would fail — but you'd learn the most from it?", category: ["general", "co_founder"] },
  { q: "What problem do you want your career to have dented by the time you're 35?", category: ["general"] },
  { q: "What's the version of success that would genuinely make you happy — not impress anyone else?", category: ["general"] },
  { q: "Is it better to be a generalist or a specialist in the first 5 years of your career? Defend your answer.", category: ["general"] },
  { q: "What's something you changed your mind about completely in the last year?", category: ["general"] },

  // ── Fun / Light ────────────────────────────────────────────
  { q: "You have unlimited AWS credits and one weekend. What do you spin up?", category: ["coding"] },
  { q: "Which fictional character would be the best CTO? Defend your choice.", category: ["general"] },
  { q: "What app on your phone do you use most that you're slightly embarrassed to admit?", category: ["general"] },
  { q: "If your GitHub profile were a person, what would they be like at a party?", category: ["coding"] },
  { q: "What's the most unnecessary but genuinely impressive thing you've automated?", category: ["coding"] },
  { q: "Your college is putting you on a poster. What does it say?", category: ["general"] },
  { q: "Rate your campus canteen's wifi on a scale of TCP to UDP.", category: ["coding", "quiz"] },
  { q: "If Stack Overflow went down permanently, what would you actually do?", category: ["coding"] },
  { q: "Design Twitter in 15 minutes. Go.", category: ["coding", "design"] },
  { q: "What technology trend do you think is genuinely overhyped right now?", category: ["general", "coding"] },
  { q: "You meet your college-self on the first day. What's the one thing you actually say — not the cliché advice?", category: ["general"] },
  { q: "What's the most creative solution you've seen to a boring problem?", category: ["general", "design"] },
  { q: "Pick any open problem in CS. What would cracking it change about the world?", category: ["coding", "quiz"] },
  { q: "What does 'good code' mean to you in one sentence?", category: ["coding"] },
  { q: "Build or buy? When does each answer actually make sense?", category: ["coding", "co_founder"] },
];

// Co-founder mode uses a fixed 3-question sequence (not random)
export const CO_FOUNDER_QUESTIONS = [
  "What specific problem are you solving, and how did you first encounter it personally? Be concrete — describe a real situation, not a market gap.",
  "What does success look like in 2 years — for the company, and for you personally? Are they the same thing?",
  "You and your co-founder have a fundamental disagreement about product direction. Neither of you will budge. What do you do?",
];

export function pickIcebreakerQuestion(
  badgeCategoriesA: string[],
  badgeCategoriesB: string[]
): string {
  // Find shared badge categories
  const shared = badgeCategoriesA.filter((c) => badgeCategoriesB.includes(c));

  // Filter questions that match shared categories, or fall back to general
  const relevant = shared.length > 0
    ? QUESTIONS.filter((q) => q.category.some((c) => shared.includes(c)))
    : QUESTIONS.filter((q) => q.category.includes("general"));

  const pool = relevant.length > 0 ? relevant : QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)].q;
}
