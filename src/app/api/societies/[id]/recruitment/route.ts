import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: postings } = await supabase
      .from("society_recruitment")
      .select("id, title, description, criteria, deadline, active, created_at")
      .eq("society_id", id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    // Check which ones current user has applied to
    const postingIds = (postings ?? []).map((p) => p.id);
    const { data: myApps } = postingIds.length
      ? await supabase.from("recruitment_applications").select("recruitment_id, status").eq("applicant_id", user.id).in("recruitment_id", postingIds)
      : { data: [] };
    const appMap = Object.fromEntries((myApps ?? []).map((a) => [a.recruitment_id, a.status]));

    return NextResponse.json({
      postings: (postings ?? []).map((p) => ({ ...p, myStatus: appMap[p.id] ?? null })),
    });
  } catch (err) {
    console.error("Recruitment GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Apply to a posting
    if (body.action === "apply") {
      const { postingId, portfolioText } = body;
      if (!postingId || !portfolioText?.trim())
        return NextResponse.json({ error: "postingId and portfolioText required." }, { status: 400 });

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

      const admin = createAdminClient();
      const { error } = await admin.from("recruitment_applications").insert({
        recruitment_id: postingId,
        applicant_id:   user.id,
        portfolio_text: portfolioText.trim(),
      });
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Already applied." }, { status: 400 });
        throw error;
      }
      return NextResponse.json({ success: true });
    }

    // Create a posting (leader only)
    const { title, description, criteria, deadline } = body;
    if (!title || !description) return NextResponse.json({ error: "title and description required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: society } = await supabase.from("societies").select("leader_id").eq("id", id).single();
    if (!society || society.leader_id !== user.id)
      return NextResponse.json({ error: "Only the society leader can post recruitment." }, { status: 403 });

    const admin = createAdminClient();
    await admin.from("society_recruitment").insert({
      society_id: id, title, description,
      criteria: criteria ?? null, deadline: deadline ?? null,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Recruitment POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
