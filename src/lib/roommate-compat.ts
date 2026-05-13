// Roommate compatibility engine
// Returns a score (0–100) and a list of differences.
// Hard mismatches return score=-1 and flag incompatible=true.

export type RoommateProfile = {
  sleep_schedule: number;   // 1–5
  cleanliness:    number;   // 1–5
  visitors:       string;
  diet:           string;
  diet_pref:      string;
  study_env:      string;
  smoke:          string;
  drink:          string;
  weekend:        string;
  wake_time:      string;
  overnight:      string;
  gender_pref:    string;
};

export type CompatResult = {
  score:        number;   // 0–100; -1 means hard mismatch
  incompatible: boolean;
  diffs:        string[]; // human-readable mismatch descriptions
};

const VISITORS_SCORE: Record<string, number>  = { rarely: 1, monthly: 2, weekly: 3, often: 4 };
const WEEKEND_SCORE:  Record<string, number>  = { home_always: 1, sometimes_home: 2, stays_in: 3, social: 4 };
const WAKE_SCORE:     Record<string, number>  = { early: 1, normal: 2, late: 3, very_late: 4 };
const OVERNIGHT_SCORE:Record<string, number>  = { never: 1, rarely: 2, ok: 3, often: 4 };
const STUDY_SCORE:    Record<string, number>  = { silent: 1, music_ok: 2, calls_ok: 3, anything: 4 };

export function calcCompatibility(a: RoommateProfile, b: RoommateProfile): CompatResult {
  let score = 100;
  const diffs: string[] = [];
  let incompatible = false;

  // ── Sleep schedule (scale 1–5, each step = 10pts, hard mismatch ≥3) ──
  const sleepDiff = Math.abs(a.sleep_schedule - b.sleep_schedule);
  score -= sleepDiff * 10;
  if (sleepDiff >= 3) {
    incompatible = true;
    diffs.push("Very different sleep schedules");
  } else if (sleepDiff === 2) {
    diffs.push("Different sleep times");
  }

  // ── Cleanliness (scale 1–5, each step = 8pts, hard mismatch ≥3) ──
  const cleanDiff = Math.abs(a.cleanliness - b.cleanliness);
  score -= cleanDiff * 8;
  if (cleanDiff >= 3) {
    incompatible = true;
    diffs.push("Very different cleanliness standards");
  } else if (cleanDiff === 2) {
    diffs.push("Cleanliness mismatch");
  }

  // ── Study environment (hard mismatch: silent vs calls_ok) ──
  const studyDiff = Math.abs((STUDY_SCORE[a.study_env] ?? 2) - (STUDY_SCORE[b.study_env] ?? 2));
  score -= studyDiff * 6;
  if (
    (a.study_env === "silent" && b.study_env === "calls_ok") ||
    (b.study_env === "silent" && a.study_env === "calls_ok")
  ) {
    incompatible = true;
    diffs.push("Incompatible study environments (silence vs loud calls)");
  } else if (studyDiff === 2) {
    diffs.push("Different study environment preferences");
  }

  // ── Smoke (hard mismatch: one says no, other says yes) ──
  if (
    (a.smoke === "no" && b.smoke === "yes") ||
    (b.smoke === "no" && a.smoke === "yes")
  ) {
    score -= 25;
    incompatible = true;
    diffs.push("Smoking mismatch — one is a non-smoker");
  }

  // ── Drink ──
  if (
    (a.drink === "no" && b.drink === "yes") ||
    (b.drink === "no" && a.drink === "yes")
  ) {
    score -= 12;
    diffs.push("Different drinking preferences");
  }

  // ── Visitors ──
  const visDiff = Math.abs((VISITORS_SCORE[a.visitors] ?? 2) - (VISITORS_SCORE[b.visitors] ?? 2));
  score -= visDiff * 5;
  if (visDiff >= 3) diffs.push("Very different visitors policy");

  // ── Overnight guests ──
  const ovDiff = Math.abs((OVERNIGHT_SCORE[a.overnight] ?? 2) - (OVERNIGHT_SCORE[b.overnight] ?? 2));
  score -= ovDiff * 5;
  if (ovDiff >= 3) diffs.push("Different stance on overnight guests");

  // ── Wake time ──
  const wakeDiff = Math.abs((WAKE_SCORE[a.wake_time] ?? 2) - (WAKE_SCORE[b.wake_time] ?? 2));
  score -= wakeDiff * 4;
  if (wakeDiff >= 3) diffs.push("Very different wake-up times");

  // ── Weekend ──
  const wkDiff = Math.abs((WEEKEND_SCORE[a.weekend] ?? 2) - (WEEKEND_SCORE[b.weekend] ?? 2));
  score -= wkDiff * 4;

  // ── Diet preference ──
  if (
    (a.diet_pref === "veg_only" && b.diet === "non_veg") ||
    (b.diet_pref === "veg_only" && a.diet === "non_veg")
  ) {
    score -= 10;
    diffs.push("Diet preference mismatch");
  }

  const finalScore = incompatible ? -1 : Math.max(0, Math.round(score));
  return { score: finalScore, incompatible, diffs };
}

// Summary string for the one-liner shown on the feed card
export function compatSummary(result: CompatResult): string {
  if (result.incompatible) return result.diffs[0] ?? "Incompatible on key factors";
  if (result.diffs.length === 0) return "Great match across all factors";
  if (result.diffs.length === 1) return `Minor diff: ${result.diffs[0]}`;
  return `Differs on: ${result.diffs.slice(0, 2).join(", ")}`;
}
