// API Route: /api/orders
// GET  — list all orders (with concert + device info joined)
// POST — create a new rental order (validates dates, checks conflicts, writes occupied_dates)

import { type NextRequest, NextResponse } from "next/server";
import {
  sanitizeText,
  isValidDateRange,
  isValidOccupyMode,
  toAmount,
  toNonNegativeInt,
} from "@/lib/validation";
import { calculateOccupancy } from "@/lib/occupancy";
import type { OccupyMode } from "@/lib/db";
import { getDb } from "@/lib/get-db";

// GET /api/orders — returns all orders with concert title and device names joined.
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    const { results } = await db
      .prepare(
        `SELECT
           ro.*,
           cc.title        AS concert_title,
           cc.location_type,
           cc.start_date   AS concert_start,
           cc.end_date     AS concert_end,
           body.device_name AS camerabody_name,
           body.color       AS camerabody_color,
           lens.device_name AS lense_name,
           lens.color       AS lense_color
         FROM rental_orders ro
         JOIN concert_calendar cc ON ro.concert_id = cc.concert_id
         LEFT JOIN device_asset body ON ro.camerabody_id = body.device_id
         LEFT JOIN device_asset lens ON ro.lense_id = lens.device_id
         ORDER BY ro.start_date DESC`
      )
      .all();

    return NextResponse.json(results);
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders — create a rental order.
// Body: { concert_id, start_date, end_date, camerabody_id?, lense_id?,
//         daily_rate, shipping_fee?, intern_fee?,
//         occupy_mode, buffer_days_before?, buffer_days_after?, notes? }
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json() as Record<string, unknown>;

    // ── 1. Validate required fields ────────────────────────────────────────

    const concertId = parseInt(body.concert_id as string, 10);
    if (!Number.isFinite(concertId)) {
      return NextResponse.json({ error: "concert_id is required" }, { status: 400 });
    }

    if (!isValidDateRange(body.start_date as string, body.end_date as string)) {
      return NextResponse.json(
        { error: "Invalid rental date range" },
        { status: 400 }
      );
    }

    const camerabodyId = body.camerabody_id ? parseInt(body.camerabody_id as string, 10) : null;
    const lenseId = body.lense_id ? parseInt(body.lense_id as string, 10) : null;
    if (!camerabodyId && !lenseId) {
      return NextResponse.json(
        { error: "At least one of camerabody_id or lense_id must be provided" },
        { status: 400 }
      );
    }

    if (!isValidOccupyMode(body.occupy_mode)) {
      return NextResponse.json(
        { error: "occupy_mode must be safe | aggressive | custom | shipping" },
        { status: 400 }
      );
    }

    const occupyMode = body.occupy_mode as OccupyMode;
    const bufferBefore = toNonNegativeInt(body.buffer_days_before);
    const bufferAfter = toNonNegativeInt(body.buffer_days_after);
    const dailyRate = toAmount(body.daily_rate);
    const shippingFee = toAmount(body.shipping_fee);
    const internFee = toAmount(body.intern_fee);
    const notes = body.notes ? sanitizeText(body.notes) : null;

    // ── 2. Verify concert exists and rental dates fit within concert dates ──

    const concert = await db
      .prepare(
        "SELECT concert_id, start_date, end_date FROM concert_calendar WHERE concert_id = ?"
      )
      .bind(concertId)
      .first<{ concert_id: number; start_date: string; end_date: string }>();

    if (!concert) {
      return NextResponse.json({ error: "Concert not found" }, { status: 404 });
    }

    // Rental period must be within or touching concert dates.
    if ((body.start_date as string) < concert.start_date || (body.end_date as string) > concert.end_date) {
      return NextResponse.json(
        {
          error: `Rental dates must be within the concert period (${concert.start_date} – ${concert.end_date})`,
        },
        { status: 422 }
      );
    }

    // ── 3. Calculate occupancy window ──────────────────────────────────────

    const { occupiedStart, occupiedEnd, occupiedDates } = calculateOccupancy({
      startDate: body.start_date as string,
      endDate: body.end_date as string,
      occupyMode,
      bufferDaysBefore: bufferBefore,
      bufferDaysAfter: bufferAfter,
    });

    // ── 4. Check for device conflicts in occupied_dates ────────────────────

    const deviceIds = [camerabodyId, lenseId].filter(Boolean) as number[];
    const placeholders = deviceIds.map(() => "?").join(", ");
    const datePlaceholders = occupiedDates.map(() => "?").join(", ");

    const conflicts = await db
      .prepare(
        `SELECT od.device_id, od.date, ro.order_id
         FROM occupied_dates od
         JOIN rental_orders ro ON od.order_id = ro.order_id
         WHERE od.device_id IN (${placeholders})
           AND od.date IN (${datePlaceholders})`
      )
      .bind(...deviceIds, ...occupiedDates)
      .all<{ device_id: number; date: string; order_id: number }>();

    if (conflicts.results.length > 0) {
      const conflict = conflicts.results[0];
      return NextResponse.json(
        {
          error: `Device conflict: device #${conflict.device_id} is already booked on ${conflict.date} (order #${conflict.order_id})`,
          conflicts: conflicts.results,
        },
        { status: 409 }
      );
    }

    // ── 5. Write order + device_calendar + occupied_dates atomically ───────

    // D1 batch runs all statements in a single transaction.
    const insertOrder = db
      .prepare(
        `INSERT INTO rental_orders
           (concert_id, start_date, end_date, camerabody_id, lense_id,
            daily_rate, shipping_fee, intern_fee,
            occupy_mode, buffer_days_before, buffer_days_after, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .bind(
        concertId,
        body.start_date as string,
        body.end_date as string,
        camerabodyId,
        lenseId,
        dailyRate,
        shippingFee,
        internFee,
        occupyMode,
        bufferBefore,
        bufferAfter,
        notes
      );

    // Execute order insert first (we need order_id for the follow-up inserts).
    const order = await insertOrder.first<{ order_id: number }>();
    if (!order) throw new Error("Failed to insert order");

    const orderId = order.order_id;

    // Insert device_calendar row.
    const insertCalendar = db
      .prepare(
        `INSERT INTO device_calendar
           (order_id, camerabody_id, lense_id, start_date, end_date)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(orderId, camerabodyId, lenseId, occupiedStart, occupiedEnd);

    // Insert one occupied_dates row per device per occupied day.
    const occupiedInserts = deviceIds.flatMap((deviceId) =>
      occupiedDates.map((date) =>
        db
          .prepare(
            "INSERT INTO occupied_dates (device_id, date, order_id) VALUES (?, ?, ?)"
          )
          .bind(deviceId, date, orderId)
      )
    );

    // Batch all inserts together for atomicity.
    await db.batch([insertCalendar, ...occupiedInserts]);

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
