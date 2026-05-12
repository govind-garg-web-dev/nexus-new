import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data } = await supabase
      .from("co_founder_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("CF profile GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commitmentLevel, equityComfort, equityRange, domain, problemStatement } = body;

    if (!commitmentLevel || !domain || !problemStatement) {
      return NextResponse.json({ error: "commitmentLevel, domain, and problemStatement are required." }, { status: 400 });
    }

    if (problemStatement.trim().length < 150) {
      return NextResponse.json({ error: "Problem statement must be at least 150 characters." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin.from("co_founder_profiles").upsert({
      user_id:           user.id,
      commitment_level:  commitmentLevel,
      equity_comfort:    equityComfort ?? false,
      equity_range:      equityRange ?? null,
      domain,
      problem_statement: problemStatement,
      active:            true,
    }, { onConflict: "user_id" });

    if (error) throw error;

    // Also update intent on profile
    await admin.from("profiles").update({ intent: "co_founder" }).eq("id", user.id);

    // Trigger re-embedding
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/embed`, { method: "POST" });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CF profile POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
