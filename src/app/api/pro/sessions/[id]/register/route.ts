import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("session_registrations").upsert(
      { session_id: id, user_id: user.id },
      { onConflict: "session_id,user_id", ignoreDuplicates: true }
    );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Session register error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
