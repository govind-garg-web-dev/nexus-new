export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const formData = await request.formData();
    const files    = formData.getAll("photos") as File[];

    if (!files.length) return NextResponse.json({ urls: [] });

    const admin = createAdminClient();
    const urls: string[] = [];

    for (const file of files.slice(0, 4)) {
      if (!["image/jpeg","image/jpg","image/png","image/webp"].includes(file.type)) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const ext    = file.type.split("/")[1] ?? "jpg";
      const path   = `pg/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await admin.storage.from("pg-photos").upload(path, buffer, { contentType: file.type });
      if (!error) {
        const { data: { publicUrl } } = admin.storage.from("pg-photos").getPublicUrl(path);
        urls.push(publicUrl);
      }
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("PG photo upload error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
