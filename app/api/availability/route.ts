// API Route: /api/availability
// GET ?deviceId=1&deviceId=2&... — returns all occupied dates for the given device IDs.
// Used by CreateOrderTab to show real-time device availability.

import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/get-db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb(request);

    const { searchParams } = new URL(request.url);
    const deviceIds = searchParams.getAll("deviceId").map(Number).filter(Number.isFinite);

    if (deviceIds.length === 0) {
      return NextResponse.json([]);
    }

    const placeholders = deviceIds.map(() => "?").join(", ");
    const { results } = await db
      .prepare(
        `SELECT device_id, date FROM occupied_dates WHERE device_id IN (${placeholders}) ORDER BY date`
      )
      .bind(...deviceIds)
      .all<{ device_id: number; date: string }>();

    return NextResponse.json(results);
  } catch (err) {
    console.error("[GET /api/availability]", err);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
