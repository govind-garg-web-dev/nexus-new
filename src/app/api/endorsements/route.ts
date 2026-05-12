import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SEMESTER_MONTHS = 6; // Jan–Jun or Jul–Dec

function semesterStart(): Date {
  const now   = new Date();
  const month = now.getMonth(); // 0-indexed
  return new Date(now.getFullYear(), month < 6 ? 0 : 6, 1); // Jan 1 or Jul 1
}

// POST /api/endorsements
// Body: { endorseeId, category, matchEventId?, note? }
export async function POST(request: Request) {
  try {
    const { endorseeId, category, matchEventId, note } = await request.json();

    if (!endorseeId || !category) {
      return NextResponse.json({ error: "endorseeId and category are required." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    if (user.id === endorseeId) {
      return NextResponse.json({ error: "You cannot endorse yourself." }, { status: 400 });
    }

    // ── Collaboration gate ────────────────────────────────────
    // Must have a revealed match with the endorsee
    const { data: match } = await userClient
      .from("match_events")
      .select("id")
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${endorseeId}),and(user_a_id.eq.${endorseeId},user_b_id.eq.${user.id})`)
      .eq("status", "revealed")
      .limit(1)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({
        error: "You can only endorse someone you have collaborated with (revealed match required)."
      }, { status: 403 });
    }

    // ── 20/semester cap ───────────────────────────────────────
    const semStart = semesterStart();
    const { count } = await userClient
      .from("endorsements")
      .select("id", { count: "exact", head: true })
      .eq("endorser_id", user.id)
      .gte("created_at", semStart.toISOString());

    if ((count ?? 0) >= 20) {
      return NextResponse.json({
        error: `You have used all 20 endorsements for this semester. Resets in the next semester.`
      }, { status: 400 });
    }

    // ── Endorser must have a badge in this category ───────────
    const { data: endorserBadge } = await userClient
      .from("badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!endorserBadge) {
      return NextResponse.json({
        error: `You need an active ${category} badge to endorse in that category.`
      }, { status: 403 });
    }

    const admin = createAdminClient();

    // Insert endorsement (unique constraint: one per endorser+endorsee+category)
    const { error: insertError } = await admin
      .from("endorsements")
      .insert({
        endorser_id:    user.id,
        endorsee_id:    endorseeId,
        category,
        match_event_id: matchEventId ?? match.id,
        note:           note ?? null,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "You have already endorsed this person in this category." }, { status: 400 });
      }
      throw insertError;
    }

    // +3 reliability to endorsee
    await admin.rpc("apply_score_event", {
      p_user_id:      endorseeId,
      p_delta:        3,
      p_reason:       "endorsement_received",
      p_reference_id: match.id,
    });

    return NextResponse.json({ success: true, semesterUsed: (count ?? 0) + 1, semesterMax: 20 });
  } catch (err) {
    console.error("Endorsement error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET /api/endorsements?userId=xxx — fetch endorsements for a profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: endorsements } = await userClient
      .from("endorsements")
      .select("id, category, note, created_at")
      .eq("endorsee_id", userId)
      .order("created_at", { ascending: false });

    // Group by category with count
    const grouped: Record<string, number> = {};
    for (const e of endorsements ?? []) {
      grouped[e.category] = (grouped[e.category] ?? 0) + 1;
    }

    return NextResponse.json({ endorsements: endorsements ?? [], grouped });
  } catch (err) {
    console.error("Endorsements fetch error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
