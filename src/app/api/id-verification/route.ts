import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
    if (!allowed.includes(file.type))
      return NextResponse.json({ error: "Only JPEG, PNG, WebP accepted." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin  = createAdminClient();
    const ext    = file.type.split("/")[1] ?? "jpg";
    const path   = `id-verification/${user.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to private storage (admin-only readable)
    const { error: uploadErr } = await admin.storage
      .from("id-verifications")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("ID upload error:", uploadErr);
      return NextResponse.json({
        error: "Upload failed. Ensure 'id-verifications' bucket exists in Supabase Storage (private)."
      }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("id-verifications").getPublicUrl(path);

    // Upsert verification request
    await admin.from("id_verification_requests").upsert({
      user_id:   user.id,
      photo_url: publicUrl,
      status:    "pending",
    }, { onConflict: "user_id" });

    // Mark user as needs_id_verification
    await admin.from("users").update({ needs_id_verification: true }).eq("id", user.id);

    return NextResponse.json({ success: true, message: "ID submitted. Our team will verify within 24 hours." });
  } catch (err) {
    console.error("ID verification error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
