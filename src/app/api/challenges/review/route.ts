import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — returns all under_review writing/design submissions for this user to review
// (excluding their own and ones they've already reviewed)
export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Fetch all under_review writing + design submissions that aren't the caller's
    const { data: rawSubmissions } = await userClient
      .from("challenge_submissions")
      .select(`
        id, created_at, submitted_text, submitted_file_url,
        skill_challenges ( id, title, category, difficulty, description )
      `)
      .eq("status", "under_review")
      .neq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(30);

    // Exclude already-reviewed
    const subIds = (rawSubmissions ?? []).map((s) => s.id);
    const { data: myReviews } = subIds.length
      ? await userClient.from("peer_reviews").select("submission_id").eq("reviewer_id", user.id).in("submission_id", subIds)
      : { data: [] };

    const reviewedIds = new Set((myReviews ?? []).map((r) => r.submission_id));

    // Only show writing + design (not coding/quiz which are auto-graded)
    const submissions = (rawSubmissions ?? []).filter((s) => {
      if (reviewedIds.has(s.id)) return false;
      const meta = Array.isArray(s.skill_challenges) ? s.skill_challenges[0] : s.skill_challenges;
      return ["writing", "design"].includes((meta as { category: string }).category);
    });

    // Get review counts per submission
    const ids = submissions.map((s) => s.id);
    const { data: reviewCounts } = ids.length
      ? await userClient.from("peer_reviews").select("submission_id, verdict").in("submission_id", ids)
      : { data: [] };

    const enriched = submissions.map((s) => {
      const reviews = (reviewCounts ?? []).filter((r) => r.submission_id === s.id);
      return {
        ...s,
        approvals:  reviews.filter((r) => r.verdict === "approved").length,
        rejections: reviews.filter((r) => r.verdict === "rejected").length,
        totalReviews: reviews.length,
      };
    });

    return NextResponse.json({ submissions: enriched });
  } catch (err) {
    console.error("Review GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST — submit a review verdict (any authenticated user can review; can't review own)
export async function POST(request: Request) {
  try {
    const { submissionId, verdict, note } = await request.json();

    if (!submissionId || !["approved", "rejected"].includes(verdict)) {
      return NextResponse.json({ error: "submissionId and verdict (approved|rejected) required." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: submission } = await userClient
      .from("challenge_submissions")
      .select("id, user_id, challenge_id, status, skill_challenges(category, difficulty)")
      .eq("id", submissionId)
      .single();

    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (submission.status !== "under_review") return NextResponse.json({ error: "No longer under review." }, { status: 400 });
    if (submission.user_id === user.id) return NextResponse.json({ error: "Cannot review your own submission." }, { status: 400 });

    const meta = Array.isArray(submission.skill_challenges)
      ? submission.skill_challenges[0] as { category: string; difficulty: number }
      : submission.skill_challenges as { category: string; difficulty: number };

    const admin = createAdminClient();

    const { error: reviewError } = await admin
      .from("peer_reviews")
      .insert({ submission_id: submissionId, reviewer_id: user.id, verdict, note: note?.trim() ?? null });

    if (reviewError) {
      if (reviewError.code === "23505") return NextResponse.json({ error: "You already reviewed this." }, { status: 400 });
      throw reviewError;
    }

    // Award coins to the reviewer
    const { data: reviewCoinConfig } = await admin
      .from("coin_config").select("coins").eq("action_key", "challenge_review").single();
    const reviewCoins = reviewCoinConfig?.coins ?? 5;
    await admin.rpc("award_coins", {
      p_user_id:   user.id,
      p_amount:    reviewCoins,
      p_reason:    "challenge_review",
      p_reference: submissionId,
    });

    // Count approvals / rejections
    const { data: reviews } = await admin
      .from("peer_reviews").select("verdict").eq("submission_id", submissionId);

    const approvals  = (reviews ?? []).filter((r) => r.verdict === "approved").length;
    const rejections = (reviews ?? []).filter((r) => r.verdict === "rejected").length;

    // 2 approvals → pass + mint badge
    if (approvals >= 2) {
      await admin.from("challenge_submissions").update({ status: "passed" }).eq("id", submissionId);

      await admin.from("badges").upsert({
        user_id:       submission.user_id,
        challenge_id:  submission.challenge_id,
        submission_id: submissionId,
        category:      meta.category,
        difficulty:    meta.difficulty,
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
      await admin.from("challenge_submissions").update({ status: "failed" }).eq("id", submissionId);
      return NextResponse.json({ verdict, approvals, rejections, outcome: "failed" });
    }

    return NextResponse.json({ verdict, approvals, rejections, outcome: "pending" });
  } catch (err) {
    console.error("Review POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
