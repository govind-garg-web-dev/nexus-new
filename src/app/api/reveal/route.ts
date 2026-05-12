import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/reveal
// Body: { matchId: string }
//
// Security rules (all must pass or 403 is returned — no detail leaked):
//  1. Caller must be authenticated
//  2. Caller must be a participant in the match (user_a_id or user_b_id)
//  3. Match status must be exactly 'icebreaker_completed'
//  4. Match must not already be 'revealed' (idempotent check)
//
// On success:
//  - Updates match status to 'revealed'
//  - Logs to reveal_log
//  - Returns { userA, userB } identity objects
//
export async function POST(request: Request) {
  try {
    const { matchId } = await request.json();

    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required." }, { status: 400 });
    }

    // ── 1. Authenticate the caller ──────────────────────────
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // ── 2. Load the match (RLS ensures caller is a participant) ──
    const { data: match, error: matchError } = await userClient
      .from("match_events")
      .select("id, user_a_id, user_b_id, status")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      // Deliberately vague — do not reveal whether match exists
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // ── 3. Caller must be a participant ─────────────────────
    const isParticipant =
      match.user_a_id === user.id || match.user_b_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // ── 4. Status must be icebreaker_completed ──────────────
    if (match.status !== "icebreaker_completed") {
      return NextResponse.json(
        { error: "Icebreaker not yet completed by both parties." },
        { status: 403 }
      );
    }

    // ── From here: use the admin client (bypasses RLS) ──────
    const admin = createAdminClient();

    // ── 5. Fetch real identities from auth.users ────────────
    const [{ data: authUserA }, { data: authUserB }] = await Promise.all([
      admin.auth.admin.getUserById(match.user_a_id),
      admin.auth.admin.getUserById(match.user_b_id),
    ]);

    if (!authUserA.user || !authUserB.user) {
      return NextResponse.json(
        { error: "Could not retrieve identity data." },
        { status: 500 }
      );
    }

    const extractIdentity = (u: typeof authUserA.user) => ({
      name: u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "Unknown",
      email: u.email ?? null,
      avatarUrl: u.user_metadata?.avatar_url ?? null,
    });

    // ── 6. Mark as revealed ─────────────────────────────────
    await admin
      .from("match_events")
      .update({ status: "revealed", revealed_at: new Date().toISOString() })
      .eq("id", matchId);

    // ── 7. Log both sides of the reveal ─────────────────────
    await admin.from("reveal_log").insert([
      {
        match_event_id: matchId,
        requester_id: user.id,
        revealed_user_id:
          user.id === match.user_a_id ? match.user_b_id : match.user_a_id,
      },
    ]);

    // ── 8. Return identity data ──────────────────────────────
    return NextResponse.json({
      userA: extractIdentity(authUserA.user),
      userB: extractIdentity(authUserB.user),
    });
  } catch (err) {
    console.error("Reveal error:", err);
    // Never leak internal error details
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
}
