import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Builds the text that represents a user's profile for embedding.
function buildEmbeddingText(profile: {
  branch?: string | null;
  college?: string | null;
  batch_year?: number | null;
  bio?: string | null;
  interests?: string[] | null;
  intent?: string | null;
  badgeCategories?: string[];
}): string {
  const parts: string[] = [];
  if (profile.branch)  parts.push(`Studies ${profile.branch}`);
  if (profile.college) parts.push(`at ${profile.college}`);
  if (profile.batch_year) parts.push(`graduating ${profile.batch_year}`);
  if (profile.badgeCategories?.length)
    parts.push(`Verified in: ${profile.badgeCategories.join(", ")}`);
  if (profile.intent && profile.intent !== "general")
    parts.push(`Looking for: ${profile.intent.replace("_", " ")}`);
  if (profile.bio?.trim()) parts.push(profile.bio.trim());
  if (profile.interests?.length)
    parts.push(`Interests: ${profile.interests.join(", ")}`);
  return parts.join(". ");
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Early exit if no OpenAI key — embedding will be generated when key is added
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        skipped: true,
        reason: "OPENAI_API_KEY not configured. Feed falls back to reliability score ordering.",
      });
    }

    // Load profile + badges
    const [{ data: profile }, { data: badges }] = await Promise.all([
      supabase.from("profiles")
        .select("branch, college, batch_year, bio, interests, intent")
        .eq("id", user.id)
        .single(),
      supabase.from("badges")
        .select("category")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString()),
    ]);

    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const badgeCategories = [...new Set((badges ?? []).map((b) => b.category))];
    const text = buildEmbeddingText({ ...profile, badgeCategories });

    if (!text.trim()) {
      return NextResponse.json({ skipped: true, reason: "Profile has no content to embed." });
    }

    // Generate embedding via OpenAI
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = response.data[0].embedding;

    // Upsert into embedding_vectors
    const admin = createAdminClient();
    await admin.from("embedding_vectors").upsert({
      user_id:        user.id,
      embedding,
      embedding_text: text,
      updated_at:     new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ success: true, textLength: text.length });
  } catch (err) {
    console.error("Embed error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
