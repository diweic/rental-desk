// API Route: /api/devices
// GET  — list all devices
// POST — create a new device
// DELETE /<id> — handled in /api/devices/[id]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { sanitizeText, isValidDeviceType, isValidHexColor, randomVibrantColor } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

// GET /api/devices — returns all devices ordered by type then name.
export async function GET(request: NextRequest) {
  try {
    const db = await getDb(request);

    const { results } = await db
      .prepare("SELECT * FROM device_asset ORDER BY device_type, device_name")
      .all();

    return NextResponse.json(results);
  } catch (err) {
    console.error("[GET /api/devices]", err);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// POST /api/devices — create a new device.
// Body: { device_name: string, device_type: "camerabody"|"lense", color?: string }
export async function POST(request: NextRequest) {
  try {
    const db = await getDb(request);

    const body = await request.json() as Record<string, unknown>;

    // Validate inputs
    const name = sanitizeText(body.device_name);
    if (!name) {
      return NextResponse.json({ error: "device_name is required" }, { status: 400 });
    }
    if (!isValidDeviceType(body.device_type)) {
      return NextResponse.json(
        { error: "device_type must be 'camerabody' or 'lense'" },
        { status: 400 }
      );
    }

    // Use provided color or generate a random vibrant one
    const color =
      typeof body.color === "string" && isValidHexColor(body.color)
        ? body.color
        : randomVibrantColor();

    const result = await db
      .prepare(
        "INSERT INTO device_asset (device_name, device_type, color) VALUES (?, ?, ?) RETURNING *"
      )
      .bind(name, body.device_type, color)
      .first();

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/devices]", err);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}
