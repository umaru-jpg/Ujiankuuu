import { NextResponse } from "next/server";
import {
  findExamScheduleById,
  updateExamSchedule,
  deleteExamSchedule,
} from "@/server/repositories/jadwalRepository";
import type { ExamType, ExamStatus } from "@/server/repositories/jadwalRepository";

// ── GET /api/jadwal/:id ────────────────────────────────────────────────
// Get a single exam schedule by ID.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const schedule = await findExamScheduleById(id);
    if (!schedule) {
      return NextResponse.json(
        { message: "Jadwal ujian tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("GET /api/jadwal/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data jadwal ujian." },
      { status: 500 }
    );
  }
}

// ── PUT /api/jadwal/:id ────────────────────────────────────────────────
// Update an existing exam schedule.
// Body: any subset of { title, subject, exam_type, exam_date, start_time,
//        end_time, room, class_names, supervisors, status, notes }

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    // Check existence
    const existing = await findExamScheduleById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Jadwal ujian tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate exam_type if provided
    if (body.exam_type !== undefined) {
      const validExamTypes: ExamType[] = ["PTS", "PAS", "UH", "UTS", "UAS", "other"];
      if (!validExamTypes.includes(body.exam_type)) {
        return NextResponse.json(
          { message: `exam_type harus salah satu dari: ${validExamTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses: ExamStatus[] = ["scheduled", "ongoing", "completed", "cancelled"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { message: `status harus salah satu dari: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate arrays if provided
    if (body.class_names !== undefined) {
      if (!Array.isArray(body.class_names) || body.class_names.length === 0) {
        return NextResponse.json(
          { message: "class_names harus berupa array tidak kosong." },
          { status: 400 }
        );
      }
    }
    if (body.supervisors !== undefined) {
      if (!Array.isArray(body.supervisors) || body.supervisors.length === 0) {
        return NextResponse.json(
          { message: "supervisors harus berupa array tidak kosong." },
          { status: 400 }
        );
      }
    }

    // Validate date format if provided
    if (body.exam_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)) {
      return NextResponse.json(
        { message: "exam_date harus dalam format YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Validate time format if provided
    if (body.start_time !== undefined && !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
      return NextResponse.json(
        { message: "start_time harus dalam format HH:mm atau HH:mm:ss." },
        { status: 400 }
      );
    }
    if (body.end_time !== undefined && !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time)) {
      return NextResponse.json(
        { message: "end_time harus dalam format HH:mm atau HH:mm:ss." },
        { status: 400 }
      );
    }

    // Validate end_time > start_time if both provided
    if (body.start_time !== undefined && body.end_time !== undefined) {
      const startTime = body.start_time.length === 5 ? body.start_time + ":00" : body.start_time;
      const endTime = body.end_time.length === 5 ? body.end_time + ":00" : body.end_time;
      if (endTime <= startTime) {
        return NextResponse.json(
          { message: "end_time harus lebih besar dari start_time." },
          { status: 400 }
        );
      }
    }

    // Build update DTO
    const updateDto: Record<string, unknown> = {};
    const allowedFields = [
      "title", "subject", "exam_type", "exam_date",
      "start_time", "end_time", "room", "class_names",
      "supervisors", "status", "notes",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateDto[field] = body[field];
      }
    }

    // Normalize time format
    if (updateDto.start_time && (updateDto.start_time as string).length === 5) {
      updateDto.start_time = (updateDto.start_time as string) + ":00";
    }
    if (updateDto.end_time && (updateDto.end_time as string).length === 5) {
      updateDto.end_time = (updateDto.end_time as string) + ":00";
    }

    // Trim strings
    if (updateDto.title) updateDto.title = (updateDto.title as string).trim();
    if (updateDto.subject) updateDto.subject = (updateDto.subject as string).trim();
    if (updateDto.room) updateDto.room = (updateDto.room as string).trim();

    const updated = await updateExamSchedule(id, updateDto);
    if (!updated) {
      return NextResponse.json(
        { message: "Gagal memperbarui jadwal ujian." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Jadwal ujian berhasil diperbarui." });
  } catch (error) {
    console.error("PUT /api/jadwal/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui jadwal ujian." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/jadwal/:id ─────────────────────────────────────────────
// Delete an exam schedule by ID.

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const existing = await findExamScheduleById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Jadwal ujian tidak ditemukan." },
        { status: 404 }
      );
    }

    const deleted = await deleteExamSchedule(id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Gagal menghapus jadwal ujian." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Jadwal ujian berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/jadwal/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus jadwal ujian." },
      { status: 500 }
    );
  }
}
