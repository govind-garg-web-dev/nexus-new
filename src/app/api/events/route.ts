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

    const body = await request.json();
    const { title, description, type, organizer, deadline, eventDate, link, tags, isFeatured,
            societyId, isCharged, ticketPrice } = body;
    if (!title || !description) {
      return NextResponse.json({ error: "title and description are required." }, { status: 400 });
    }

    // Check permission: admin/mod OR verified society leader
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const isAdmin = userData && ["admin","moderator"].includes(userData.role);

    // If from a society, verify the user is that society's leader
    let approvalStatus = "approved"; // admin posts are auto-approved
    if (societyId && !isAdmin) {
      const { data: society } = await supabase
        .from("societies").select("leader_id, verified").eq("id", societyId).single();
      if (!society || society.leader_id !== user.id || !society.verified) {
        return NextResponse.json({ error: "Only verified society leaders can submit events." }, { status: 403 });
      }
      approvalStatus = "pending"; // society events need mod approval
    } else if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: event } = await admin.from("events").insert({
      posted_by:       user.id,
      title,
      description,
      type:            type        ?? "other",
      organizer:       organizer   ?? null,
      deadline:        deadline    ?? null,
      event_date:      eventDate   ?? null,
      link:            link        ?? null,
      society_id:      societyId   ?? null,
      is_charged:      !!isCharged,
      ticket_price:    ticketPrice ?? null,
      approval_status: approvalStatus,
      tags:        tags        ?? [],
      is_featured: isFeatured  ?? false,
    }).select("id").single();

    return NextResponse.json({ success: true, eventId: event?.id });
  } catch (err) {
    console.error("Events POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
