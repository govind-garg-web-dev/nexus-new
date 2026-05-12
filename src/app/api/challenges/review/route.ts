import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/challenges/review
// Body: { submissionId, verdict: 'approved'|'rejected', note? }
export async function POST(request: Request) {
  try {
    const { submissionId, verdict, note } = await request.json();

    if (!submissionId || !["approved", "rejected"].includes(verdict)) {
      return NextResponse.json({ error: "submissionId and verdict (approved|rejected) are required." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Load the submission
    const { data: submission } = await userClient
      .from("challenge_submissions")
      .select("id, user_id, challenge_id, status, skill_challenges(category, difficulty)")
      .eq("id", submissionId)
      .single();

    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (submission.status !== "under_review") {
      return NextResponse.json({ error: "This submission is no longer under review." }, { status: 400 });
    }
    if (submission.user_id === user.id) {
      return NextResponse.json({ error: "You cannot review your own submission." }, { status: 400 });
    }

    const challengeMeta = Array.isArray(submission.skill_challenges)
      ? submission.skill_challenges[0] as { category: string; difficulty: number }
      : submission.skill_challenges as { category: string; difficulty: number };

    // Reviewer must have a badge in the same category
    const { data: reviewerBadge } = await userClient
      .from("badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", challengeMeta.category)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (!reviewerBadge) {
      return NextResponse.json({
        error: `You need an active ${challengeMeta.category} badge to review ${challengeMeta.category} submissions.`
      }, { status: 403 });
    }

    const admin = createAdminClient();

    // Insert the review (unique constraint prevents double-reviewing)
    const { error: reviewError } = await admin
      .from("peer_reviews")
      .insert({ submission_id: submissionId, reviewer_id: user.id, verdict, note: note ?? null });

    if (reviewError) {
      if (reviewError.code === "23505") {
        return NextResponse.json({ error: "You have already reviewed this submission." }, { status: 400 });
      }
      throw reviewError;
    }

    // Count approvals and rejections
    const { data: reviews } = await admin
      .from("peer_reviews")
      .select("verdict")
      .eq("submission_id", submissionId);

    const approvals  = (reviews ?? []).filter((r) => r.verdict === "approved").length;
    const rejections = (reviews ?? []).filter((r) => r.verdict === "rejected").length;

    // 2 approvals → pass and mint badge
    if (approvals >= 2) {
      await admin
        .from("challenge_submissions")
        .update({ status: "passed" })
        .eq("id", submissionId);

      await admin.from("badges").upsert({
        user_id:       submission.user_id,
        challenge_id:  submission.challenge_id,
        submission_id: submissionId,
        category:      challengeMeta.category,
        difficulty:    challengeMeta.difficulty,
      }, { onConflict: "user_id,challenge_id", ignoreDuplicates: true });

      await admin.rpc("apply_score_event", {
        p_user_id:      submission.user_id,
        p_delta:        3,
        p_reason:       "badge_earned",
        p_reference_id: submissionId,
      });

      return NextResponse.json({ verdict, approvals, rejections, outcome: "passed", badgeMinted: true });
    }

    // 2 rejections → fail
    if (rejections >= 2) {
      await admin
        .from("challenge_submissions")
        .update({ status: "failed" })
        .eq("id", submissionId);

      return NextResponse.json({ verdict, approvals, rejections, outcome: "failed" });
    }

    return NextResponse.json({ verdict, approvals, rejections, outcome: "pending" });
  } catch (err) {
    console.error("Review error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET /api/challenges/review?category=writing
// Returns submissions needing review that the caller is eligible to review
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Find categories where this user has a badge
    const { data: myBadges } = await userClient
      .from("badges")
      .select("category")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());

    const eligibleCategories = [...new Set((myBadges ?? []).map((b) => b.category))];

    if (eligibleCategories.length === 0) {
      return NextResponse.json({ submissions: [], message: "Earn a badge first to unlock peer review." });
    }

    // Fetch under_review submissions the user hasn't already reviewed, not their own
    const query = userClient
      .from("challenge_submissions")
      .select(`
        id, created_at, submitted_text, submitted_file_url,
        skill_challenges ( id, title, category, difficulty, description )
      `)
      .eq("status", "under_review")
      .neq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    if (category) {
      // Filter by specific category via join
    }

    const { data: rawSubmissions } = await query;

    // Filter to eligible categories and exclude already-reviewed
    const { data: myReviews } = await userClient
      .from("peer_reviews")
      .select("submission_id")
      .eq("reviewer_id", user.id);

    const reviewedIds = new Set((myReviews ?? []).map((r) => r.submission_id));

    const submissions = (rawSubmissions ?? []).filter((s) => {
      if (reviewedIds.has(s.id)) return false;
      const meta = Array.isArray(s.skill_challenges) ? s.skill_challenges[0] : s.skill_challenges;
      return eligibleCategories.includes((meta as { category: string }).category);
    });

    return NextResponse.json({ submissions, eligibleCategories });
  } catch (err) {
    console.error("Review fetch error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
