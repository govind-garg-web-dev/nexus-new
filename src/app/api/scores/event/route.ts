import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Score delta reference (from the masterplan):
const SCORE_DELTAS: Record<string, number> = {
  ghost:                  -5,
  no_show:               -10,
  mild_rudeness:          -5,
  harassment_verified:   -20,
  doxxing:               -30,
  skill_fraud:           -15,
  badge_earned:           +3,
  endorsement_received:   +3,
  collaboration_complete: +3,
  fast_response:          +1,
};

// POST /api/scores/event
// Body: { targetUserId, reason, referenceId? }
//
// Only callable server-to-server (protected routes) — not exposed as a user-facing endpoint.
// Uses a hardcoded delta from SCORE_DELTAS or a custom delta for moderation actions.
//
export async function POST(request: Request) {
  try {
    const { targetUserId, reason, referenceId, customDelta } = await request.json();

    if (!targetUserId || !reason) {
      return NextResponse.json(
        { error: "targetUserId and reason are required." },
        { status: 400 }
      );
    }

    // Caller must be authenticated
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Determine delta
    let delta: number;
    if (typeof customDelta === "number") {
      // Only allow custom deltas for verified moderation reasons
      const moderationReasons = ["report_verified", "badge_revoked", "account_reinstated"];
      if (!moderationReasons.some((r) => reason.startsWith(r))) {
        return NextResponse.json(
          { error: "Custom delta not allowed for this reason." },
          { status: 400 }
        );
      }
      delta = Math.max(-30, Math.min(10, customDelta)); // clamp custom delta
    } else {
      delta = SCORE_DELTAS[reason];
      if (delta === undefined) {
        return NextResponse.json(
          { error: `Unknown reason: ${reason}. Valid reasons: ${Object.keys(SCORE_DELTAS).join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Call the DB function via admin client (bypasses RLS, uses SECURITY DEFINER)
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("apply_score_event", {
      p_user_id:      targetUserId,
      p_delta:        delta,
      p_reason:       reason,
      p_reference_id: referenceId ?? null,
    });

    if (error) {
      console.error("Score event error:", error);
      return NextResponse.json({ error: "Failed to apply score event." }, { status: 500 });
    }

    return NextResponse.json({ newScore: data });
  } catch (err) {
    console.error("Score event exception:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
