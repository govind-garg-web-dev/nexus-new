import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { recruiterTier, companyVerified, companyLogoUrl } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!me || !["admin","moderator"].includes(me.role))
      return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("referral_posts").update({
      recruiter_tier:   !!recruiterTier,
      company_verified: !!companyVerified,
      company_logo_url: companyLogoUrl ?? null,
    }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Recruiter tier error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
