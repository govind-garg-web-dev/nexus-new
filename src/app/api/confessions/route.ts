import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectCrisis } from "@/lib/crisis-keywords";

// Optional: add PERSPECTIVE_API_KEY to .env.local for toxicity pre-moderation
// Get key at: console.cloud.google.com → Perspective API
async function checkToxicity(text: string): Promise<{ score: number; flagged: boolean }> {
  const key = process.env.PERSPECTIVE_API_KEY;
  if (!key) return { score: 0, flagged: false };

  try {
    const res = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${key}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment:              { text },
          requestedAttributes:  { TOXICITY: {}, SEVERE_TOXICITY: {}, THREAT: {}, IDENTITY_ATTACK: {} },
          languages:            ["en"],
        }),
      }
    );
    if (!res.ok) return { score: 0, flagged: false };
    const data = await res.json();
    const score = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
    const threat = data.attributeScores?.THREAT?.summaryScore?.value ?? 0;
    return { score, flagged: score > 0.75 || threat > 0.6 };
  } catch {
    return { score: 0, flagged: false };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "0");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();

    const { data: confessions } = await supabase
      .from("confessions")
      .select("id, content, upvotes, downvotes, created_at")
      .eq("college_domain", userData?.college_domain ?? "")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(page * 20, page * 20 + 19);

    // Get user's votes
    const ids = (confessions ?? []).map((c) => c.id);
    const { data: myVotes } = ids.length
      ? await supabase.from("confession_votes").select("confession_id,vote").eq("user_id", user.id).in("confession_id", ids)
      : { data: [] };
    const voteMap = Object.fromEntries((myVotes ?? []).map((v) => [v.confession_id, v.vote]));

    const enriched = (confessions ?? []).map((c) => ({ ...c, myVote: voteMap[c.id] ?? 0 }));
    return NextResponse.json({ confessions: enriched });
  } catch (err) {
    console.error("Confessions GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    if (!content?.trim() || content.trim().length < 10) {
      return NextResponse.json({ error: "Confession must be at least 10 characters." }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "Confession must be under 1000 characters." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();

    const hasCrisis = detectCrisis(content);
    const { score, flagged } = await checkToxicity(content);
    const status = flagged ? "pending" : "approved";

    const admin = createAdminClient();
    await admin.from("confessions").insert({
      author_id:      user.id,
      college_domain: userData?.college_domain ?? "",
      content:        content.trim(),
      toxicity_score: score,
      status,
    });

    return NextResponse.json({ success: true, status, hasCrisis });
  } catch (err) {
    console.error("Confessions POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
