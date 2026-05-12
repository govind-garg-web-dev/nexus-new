import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET: search/browse vault ───────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q        = searchParams.get("q")        || "";
    const branch   = searchParams.get("branch")   || "";
    const semester = searchParams.get("semester")  || "";
    const course   = searchParams.get("course")   || "";
    const type     = searchParams.get("type")     || "";
    const page     = parseInt(searchParams.get("page") ?? "0");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Get user's college for scoping
    const { data: userData } = await supabase
      .from("users").select("college_domain").eq("id", user.id).single();
    const { data: profile }  = await supabase
      .from("profiles").select("college").eq("id", user.id).single();

    let query = supabase
      .from("vault_uploads")
      .select("id, title, college, branch, semester, course_code, course_name, year, type, file_url, file_name, file_size, upvotes, downvotes, uploader_id, created_at")
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * 20, page * 20 + 19);

    // Scope to same college by default
    if (profile?.college) query = query.eq("college", profile.college);
    if (branch)           query = query.eq("branch", branch);
    if (semester)         query = query.eq("semester", parseInt(semester));
    if (type)             query = query.eq("type", type);
    if (course)           query = query.ilike("course_name", `%${course}%`);
    if (q) {
      query = query.or(`title.ilike.%${q}%,course_name.ilike.%${q}%,course_code.ilike.%${q}%,search_text.ilike.%${q}%`);
    }

    const { data: uploads } = await query;

    // Get uploaders' pseudonyms
    const uploaderIds = [...new Set((uploads ?? []).map((u) => u.uploader_id))];
    const { data: uploaderProfiles } = await supabase
      .from("profiles")
      .select("id, pseudonym, avatar_color, vault_karma")
      .in("id", uploaderIds);

    const profileMap = Object.fromEntries((uploaderProfiles ?? []).map((p) => [p.id, p]));

    // Get user's votes on these items
    const uploadIds = (uploads ?? []).map((u) => u.id);
    const { data: myVotes } = await supabase
      .from("vault_votes")
      .select("upload_id, vote")
      .eq("user_id", user.id)
      .in("upload_id", uploadIds);

    const voteMap = Object.fromEntries((myVotes ?? []).map((v) => [v.upload_id, v.vote]));

    const enriched = (uploads ?? []).map((u) => ({
      ...u,
      uploader:  profileMap[u.uploader_id] ?? null,
      myVote:    voteMap[u.id] ?? 0,
    }));

    return NextResponse.json({ uploads: enriched });
  } catch (err) {
    console.error("Vault GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ── POST: upload file ──────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData    = await request.formData();
    const file        = formData.get("file") as File | null;
    const title       = formData.get("title") as string;
    const branch      = formData.get("branch") as string;
    const semester    = formData.get("semester") as string;
    const courseCode  = formData.get("courseCode") as string;
    const courseName  = formData.get("courseName") as string;
    const year        = formData.get("year") as string;
    const type        = formData.get("type") as string;
    const description = formData.get("description") as string; // for search

    if (!file || !title || !branch || !courseName) {
      return NextResponse.json({ error: "file, title, branch, and courseName are required." }, { status: 400 });
    }

    const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF, images, and Word docs accepted." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 20 MB." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("college").eq("id", user.id).single();

    const admin  = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext    = file.name.split(".").pop() ?? "bin";
    const path   = `vault/${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Upload to storage
    const { error: uploadErr } = await admin.storage
      .from("academic-vault")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return NextResponse.json({ error: "Upload failed. Ensure 'academic-vault' bucket exists in Supabase Storage." }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("academic-vault").getPublicUrl(path);

    // Extract text from PDF (text-based only)
    let searchText = description ?? "";
    if (file.type === "application/pdf") {
      try {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
        const parsed   = await pdfParse(buffer);
        searchText     = (parsed.text ?? "").slice(0, 5000) + (description ? ` ${description}` : "");
      } catch {
        // Scanned PDF or extraction failed — use description only
        console.warn("PDF text extraction failed, using description only");
      }
    }

    // Save metadata
    const { data: upload } = await admin.from("vault_uploads").insert({
      uploader_id: user.id,
      title,
      college:     profile?.college ?? "",
      branch,
      semester:    semester ? parseInt(semester) : null,
      course_code: courseCode || null,
      course_name: courseName,
      year:        year ? parseInt(year) : null,
      type:        type || "notes",
      file_url:    publicUrl,
      file_name:   file.name,
      file_size:   file.size,
      mime_type:   file.type,
      search_text: searchText.slice(0, 10000),
    }).select("id").single();

    return NextResponse.json({ success: true, uploadId: upload?.id });
  } catch (err) {
    console.error("Vault POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
