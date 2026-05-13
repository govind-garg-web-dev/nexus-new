import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const q    = searchParams.get("q")    || "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    let query = supabase
      .from("events")
      .select("id, title, description, type, organizer, deadline, event_date, link, tags, is_featured, created_at")
      .order("is_featured", { ascending: false })
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(50);

    if (type)  query = query.eq("type", type);
    if (q)     query = query.or(`title.ilike.%${q}%,organizer.ilike.%${q}%,description.ilike.%${q}%`);

    const { data: events } = await query;
    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error("Events GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    // Check admin role
    const { data: userData } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, type, organizer, deadline, eventDate, link, tags, isFeatured } = body;
    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: event } = await admin.from("events").insert({
      posted_by:   user.id,
      title,
      description,
      type:        type        ?? "other",
      organizer:   organizer   ?? null,
      deadline:    deadline    ?? null,
      event_date:  eventDate   ?? null,
      link:        link        ?? null,
      tags:        tags        ?? [],
      is_featured: isFeatured  ?? false,
    }).select("id").single();

    return NextResponse.json({ success: true, eventId: event?.id });
  } catch (err) {
    console.error("Events POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
