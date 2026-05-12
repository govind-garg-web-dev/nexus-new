import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ matchId: string }> };

const ALLOWED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request, { params }: Params) {
  const { matchId } = await params;
  try {
    const formData = await request.formData();
    const file     = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF allowed." }, { status: 400 });
    if (file.size > MAX_SIZE_BYTES)
      return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Verify participation
    const { data: match } = await supabase
      .from("match_events")
      .select("id, user_a_id, user_b_id, status")
      .eq("id", matchId)
      .single();

    if (!match || (match.user_a_id !== user.id && match.user_b_id !== user.id))
      return NextResponse.json({ error: "Not a participant." }, { status: 403 });
    if (match.status !== "revealed")
      return NextResponse.json({ error: "Chat requires identity reveal first." }, { status: 403 });

    const admin  = createAdminClient();
    const ext    = file.type.split("/")[1] ?? "jpg";
    const path   = `chat/${matchId}/${user.id}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from("chat-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("Chat image upload error:", uploadErr);
      return NextResponse.json({ error: "Upload failed. Ensure 'chat-images' bucket exists in Supabase Storage." }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("chat-images").getPublicUrl(path);

    // Insert image message
    const { data: message } = await admin
      .from("messages")
      .insert({
        match_id:  matchId,
        sender_id: user.id,
        type:      "image",
        image_url: publicUrl,
        content:   null,
      })
      .select("id, sender_id, content, type, image_url, created_at")
      .single();

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Chat image error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
