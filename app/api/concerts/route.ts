// API Route: /api/concerts
// GET  — list all concerts (newest first)
// POST — create a new concert

import { type NextRequest, NextResponse } from "next/server";
import {
  sanitizeText,
  isValidLocationType,
  isValidDateRange,
} from "@/lib/validation";
import { getDb } from "@/lib/get-db";

// GET /api/concerts
export async function GET(request: NextRequest) {
  try {
    const db = await getDb(request);
    const { results } = await db
      .prepare("SELECT * FROM concert_calendar ORDER BY start_date DESC")
      .all();
    return NextResponse.json(results);
  } catch (err) {
    console.error("[GET /api/concerts]", err);
    return NextResponse.json({ error: "Failed to fetch concerts" }, { status: 500 });
  }
}

// POST /api/concerts
// Body: { title, location_type, start_date, end_date }
export async function POST(request: NextRequest) {
  try {
    const db = await getDb(request);
    const body = await request.json() as Record<string, unknown>;

    const title = sanitizeText(body.title);
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!isValidLocationType(body.location_type)) {
      return NextResponse.json(
        { error: "location_type must be 'local' or 'remote'" },
        { status: 400 }
      );
    }
    if (!isValidDateRange(body.start_date as string, body.end_date as string)) {
      return NextResponse.json(
        { error: "Invalid date range (start_date must be <= end_date)" },
        { status: 400 }
      );
    }

    const result = await db
      .prepare(
        `INSERT INTO concert_calendar (title, location_type, start_date, end_date)
         VALUES (?, ?, ?, ?) RETURNING *`
      )
      .bind(title, body.location_type as string, body.start_date as string, body.end_date as string)
      .first();

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/concerts]", err);
    return NextResponse.json({ error: "Failed to create concert" }, { status: 500 });
  }
}
