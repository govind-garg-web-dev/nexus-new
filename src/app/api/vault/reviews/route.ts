import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("course") || "";
    const professor  = searchParams.get("professor") || "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    let query = supabase
      .from("course_reviews")
      .select("id, course_code, course_name, professor_name, year_taken, clarity, fairness, difficulty, attendance_req, review_text, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (profile?.college) query = query.eq("college", profile.college);
    if (courseCode)        query = query.ilike("course_code", `%${courseCode}%`);
    if (professor)         query = query.ilike("professor_name", `%${professor}%`);

    const { data: reviews } = await query;
    return NextResponse.json({ reviews: reviews ?? [] });
  } catch (err) {
    console.error("Reviews GET error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseCode, courseName, professorName, yearTaken, clarity, fairness, difficulty, attendanceReq, reviewText } = body;

    if (!courseCode || !courseName || !professorName) {
      return NextResponse.json({ error: "courseCode, courseName, and professorName are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("college").eq("id", user.id).single();

    const admin = createAdminClient();
    const { error } = await admin.from("course_reviews").insert({
      reviewer_id:    user.id,
      college:        profile?.college ?? "",
      course_code:    courseCode,
      course_name:    courseName,
      professor_name: professorName,
      year_taken:     yearTaken ?? null,
      clarity:        clarity ?? null,
      fairness:       fairness ?? null,
      difficulty:     difficulty ?? null,
      attendance_req: attendanceReq ?? null,
      review_text:    reviewText ?? null,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "You have already reviewed this course." }, { status: 400 });
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reviews POST error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
