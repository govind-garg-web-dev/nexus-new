import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const formData    = await request.formData();
    const challengeId = formData.get("challengeId") as string;
    const file        = formData.get("file") as File | null;

    if (!challengeId || !file) {
      return NextResponse.json({ error: "challengeId and file are required." }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, or WebP images are accepted." }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File must be under 10 MB." }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: challenge } = await userClient
      .from("skill_challenges")
      .select("id, difficulty")
      .eq("id", challengeId)
      .eq("category", "design")
      .single();

    if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

    const admin = createAdminClient();

    // Upload to Supabase Storage
    const ext      = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path     = `design/${user.id}/${challengeId}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("challenge-submissions")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "File upload failed. Ensure the 'challenge-submissions' bucket exists in Supabase Storage." }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage
      .from("challenge-submissions")
      .getPublicUrl(path);

    // Create submission — goes to peer review
    const { data: submission } = await admin
      .from("challenge_submissions")
      .insert({
        user_id:             user.id,
        challenge_id:        challengeId,
        status:              "under_review",
        submitted_file_url:  publicUrl,
      })
      .select("id")
      .single();

    return NextResponse.json({
      success:      true,
      submissionId: submission?.id,
      message:      "Submitted for peer review. Badge is minted after 2 approvals from verified designers.",
    });
  } catch (err) {
    console.error("Design submit error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
