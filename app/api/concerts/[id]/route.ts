// API Route: /api/concerts/[id]
// DELETE — remove a concert (cascades to rental_orders via FK)
// PATCH  — update concert details

import { type NextRequest, NextResponse } from "next/server";
import { sanitizeText, isValidDateRange } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const concertId = parseInt(id, 10);

    if (!Number.isFinite(concertId)) {
      return NextResponse.json({ error: "Invalid concert id" }, { status: 400 });
    }

    const existing = await db
      .prepare("SELECT concert_id FROM concert_calendar WHERE concert_id = ?")
      .bind(concertId)
      .first();

    if (!existing) {
      return NextResponse.json({ error: "Concert not found" }, { status: 404 });
    }

    await db
      .prepare("DELETE FROM concert_calendar WHERE concert_id = ?")
      .bind(concertId)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/concerts/[id]]", err);
    return NextResponse.json({ error: "Failed to delete concert" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const concertId = parseInt(id, 10);

    if (!Number.isFinite(concertId)) {
      return NextResponse.json({ error: "Invalid concert id" }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.title !== undefined) {
      const title = sanitizeText(body.title);
      if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      fields.push("title = ?");
      values.push(title);
    }
    if (body.start_date !== undefined || body.end_date !== undefined) {
      // Fetch current values to fill in any missing side of the range
      const current = await db
        .prepare("SELECT start_date, end_date FROM concert_calendar WHERE concert_id = ?")
        .bind(concertId)
        .first<{ start_date: string; end_date: string }>();
      if (!current) return NextResponse.json({ error: "Concert not found" }, { status: 404 });

      const start = (body.start_date as string | undefined) ?? current.start_date;
      const end = (body.end_date as string | undefined) ?? current.end_date;
      if (!isValidDateRange(start, end)) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }
      fields.push("start_date = ?", "end_date = ?");
      values.push(start, end);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(concertId);
    const result = await db
      .prepare(`UPDATE concert_calendar SET ${fields.join(", ")} WHERE concert_id = ? RETURNING *`)
      .bind(...values)
      .first();

    return NextResponse.json(result);
  } catch (err) {
    console.error("[PATCH /api/concerts/[id]]", err);
    return NextResponse.json({ error: "Failed to update concert" }, { status: 500 });
  }
}
