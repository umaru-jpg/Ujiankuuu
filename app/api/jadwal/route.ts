import { NextResponse } from "next/server";
import {
  findAllExamSchedules,
  createExamSchedule,
  findDistinctSubjects,
} from "@/server/repositories/jadwalRepository";
import type { ExamType, ExamStatus } from "@/server/repositories/jadwalRepository";

// ── GET /api/jadwal ────────────────────────────────────────────────────
// List exam schedules with pagination, filter, and search.
// Query params: page, limit, subject, status, search

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined;
    const subject = searchParams.get("subject") || undefined;
    const status = (searchParams.get("status") as ExamStatus) || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await findAllExamSchedules({
      page,
      limit,
      subject,
      status,
      search,
    });

    // Also return distinct subjects for filter dropdown
    const subjects = await findDistinctSubjects();

    return NextResponse.json({
      ...result,
      subjects,
    });
  } catch (error) {
    console.error("GET /api/jadwal error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data jadwal ujian." },
      { status: 500 }
    );
  }
}

// ── POST /api/jadwal ───────────────────────────────────────────────────
// Create a new exam schedule.
// Body: { title, subject, exam_type, exam_date, start_time, end_time,
//         room, class_names, supervisors, status?, notes?, created_by }

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = [
      "title",
      "subject",
      "exam_type",
      "exam_date",
      "start_time",
      "end_time",
      "room",
      "class_names",
      "supervisors",
      "created_by",
    ] as const;

    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { message: `Field "${field}" wajib diisi.` },
          { status: 400 }
        );
      }
    }

    // Validate exam_type enum
    const validExamTypes: ExamType[] = ["PTS", "PAS", "UH", "UTS", "UAS", "other"];
    if (!validExamTypes.includes(body.exam_type)) {
      return NextResponse.json(
        { message: `exam_type harus salah satu dari: ${validExamTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate arrays
    if (!Array.isArray(body.class_names) || body.class_names.length === 0) {
      return NextResponse.json(
        { message: "class_names harus berupa array tidak kosong." },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.supervisors) || body.supervisors.length === 0) {
      return NextResponse.json(
        { message: "supervisors harus berupa array tidak kosong." },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)) {
      return NextResponse.json(
        { message: "exam_date harus dalam format YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Validate time format
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
      return NextResponse.json(
        { message: "start_time harus dalam format HH:mm atau HH:mm:ss." },
        { status: 400 }
      );
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time)) {
      return NextResponse.json(
        { message: "end_time harus dalam format HH:mm atau HH:mm:ss." },
        { status: 400 }
      );
    }

    // Validate end_time > start_time
    const startTime = body.start_time.length === 5 ? body.start_time + ":00" : body.start_time;
    const endTime = body.end_time.length === 5 ? body.end_time + ":00" : body.end_time;
    if (endTime <= startTime) {
      return NextResponse.json(
        { message: "end_time harus lebih besar dari start_time." },
        { status: 400 }
      );
    }

    const id = await createExamSchedule({
      title: body.title.trim(),
      subject: body.subject.trim(),
      exam_type: body.exam_type,
      exam_date: body.exam_date,
      start_time: startTime,
      end_time: endTime,
      room: body.room.trim(),
      class_names: body.class_names,
      supervisors: body.supervisors,
      status: body.status,
      notes: body.notes,
      created_by: body.created_by,
    });

    return NextResponse.json(
      { message: "Jadwal ujian berhasil dibuat.", id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/jadwal error:", error);
    return NextResponse.json(
      { message: "Gagal membuat jadwal ujian." },
      { status: 500 }
    );
  }
}
