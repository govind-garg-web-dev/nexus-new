import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runTestCases, LANGUAGE_IDS, type TestCase } from "@/lib/judge0";

export async function POST(request: Request) {
  try {
    const { challengeId, code, language } = await request.json();

    if (!challengeId || !code || !language) {
      return NextResponse.json({ error: "challengeId, code, and language are required." }, { status: 400 });
    }

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Auth
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Load challenge
    const { data: challenge } = await userClient
      .from("skill_challenges")
      .select("id, category, difficulty, test_cases, title")
      .eq("id", challengeId)
      .eq("category", "coding")
      .single();

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

    const testCases: TestCase[] = challenge.test_cases ?? [];

    // Run against Judge0
    const { results, allPassed } = await runTestCases(code, languageId, testCases);

    const status = allPassed ? "passed" : "failed";

    const admin = createAdminClient();

    // Save submission
    const { data: submission } = await admin
      .from("challenge_submissions")
      .insert({
        user_id:        user.id,
        challenge_id:   challengeId,
        status,
        submitted_code: code,
        language,
        judge0_results: results,
      })
      .select("id")
      .single();

    // Mint badge + apply score on pass
    if (allPassed && submission) {
      // Upsert badge (ignore if already earned)
      await admin.from("badges").upsert({
        user_id:       user.id,
        challenge_id:  challengeId,
        submission_id: submission.id,
        category:      "coding",
        difficulty:    challenge.difficulty,
      }, { onConflict: "user_id,challenge_id", ignoreDuplicates: true });

      // +3 reliability score for earning a badge
      await admin.rpc("apply_score_event", {
        p_user_id:      user.id,
        p_delta:        3,
        p_reason:       "badge_earned",
        p_reference_id: submission.id,
      });
    }

    // Return visible test results only (hide hidden test case I/O)
    const safeResults = results.map((r) => ({
      passed:  r.passed,
      hidden:  r.hidden,
      status:  r.status,
      stdout:  r.hidden && !r.passed ? null : r.stdout,
      stderr:  r.hidden ? null : r.stderr,
      time:    r.time,
      memory:  r.memory,
      expected: r.hidden ? null : r.expected,
    }));

    return NextResponse.json({
      status,
      passed: allPassed,
      results: safeResults,
      badgeMinted: allPassed,
    });
  } catch (err) {
    console.error("Coding submit error:", err);
    return NextResponse.json({ error: "Submission failed. Try again." }, { status: 500 });
  }
}
