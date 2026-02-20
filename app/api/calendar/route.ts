// API Route: /api/calendar
// GET — returns calendar events for FullCalendar, built from device_calendar joined with orders + devices.

import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/get-db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb(request);

    const { results } = await db
      .prepare(
        `SELECT
           dc.calendar_id,
           dc.order_id,
           dc.start_date,
           dc.end_date,
           ro.occupy_mode,
           ro.notes,
           ro.start_date   AS rental_start,
           ro.end_date     AS rental_end,
           cc.title        AS concert_title,
           body.device_name AS camerabody_name,
           body.color       AS camerabody_color,
           lens.device_name AS lense_name,
           lens.color       AS lense_color
         FROM device_calendar dc
         JOIN rental_orders ro    ON dc.order_id     = ro.order_id
         JOIN concert_calendar cc ON ro.concert_id   = cc.concert_id
         LEFT JOIN device_asset body ON dc.camerabody_id = body.device_id
         LEFT JOIN device_asset lens ON dc.lense_id       = lens.device_id
         ORDER BY dc.start_date ASC`
      )
      .all<{
        calendar_id: number;
        order_id: number;
        start_date: string;
        end_date: string;
        occupy_mode: string;
        notes: string | null;
        rental_start: string;
        rental_end: string;
        concert_title: string;
        camerabody_name: string | null;
        camerabody_color: string | null;
        lense_name: string | null;
        lense_color: string | null;
      }>();

    // Shape the data for FullCalendar consumption.
    const events = results.map((row) => {
      // Build display title from available device names
      const parts = [row.camerabody_name, row.lense_name].filter(Boolean);
      const title = parts.join(" + ") || "Device";

      // Use camera body color, or lens color, or a default blue
      const color = row.camerabody_color ?? row.lense_color ?? "#3b82f6";

      return {
        id: String(row.calendar_id),
        title,
        start: row.start_date,
        end: row.end_date,
        color,
        extendedProps: {
          concertTitle: row.concert_title,
          rentalStart: row.rental_start,
          rentalEnd: row.rental_end,
          occupyMode: row.occupy_mode,
          notes: row.notes,
        },
      };
    });

    return NextResponse.json(events);
  } catch (err) {
    console.error("[GET /api/calendar]", err);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}
