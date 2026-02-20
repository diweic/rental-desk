// API Route: /api/devices/[id]
// DELETE — remove a device by ID (cascades to occupied_dates via FK)
// PATCH  — update device name or color

import { type NextRequest, NextResponse } from "next/server";
import { sanitizeText, isValidHexColor } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

// DELETE /api/devices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb(request);
    const { id } = await params;
    const deviceId = parseInt(id, 10);

    if (!Number.isFinite(deviceId)) {
      return NextResponse.json({ error: "Invalid device id" }, { status: 400 });
    }

    // Check the device exists first
    const existing = await db
      .prepare("SELECT device_id FROM device_asset WHERE device_id = ?")
      .bind(deviceId)
      .first();

    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    await db
      .prepare("DELETE FROM device_asset WHERE device_id = ?")
      .bind(deviceId)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/devices/[id]]", err);
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}

// PATCH /api/devices/[id] — update device_name and/or color
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb(request);
    const { id } = await params;
    const deviceId = parseInt(id, 10);

    if (!Number.isFinite(deviceId)) {
      return NextResponse.json({ error: "Invalid device id" }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.device_name !== undefined) {
      const name = sanitizeText(body.device_name);
      if (!name) return NextResponse.json({ error: "device_name cannot be empty" }, { status: 400 });
      fields.push("device_name = ?");
      values.push(name);
    }

    if (body.color !== undefined) {
      if (!isValidHexColor(body.color)) {
        return NextResponse.json({ error: "Invalid hex color" }, { status: 400 });
      }
      fields.push("color = ?");
      values.push(body.color);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(deviceId);
    const result = await db
      .prepare(`UPDATE device_asset SET ${fields.join(", ")} WHERE device_id = ? RETURNING *`)
      .bind(...values)
      .first();

    return NextResponse.json(result);
  } catch (err) {
    console.error("[PATCH /api/devices/[id]]", err);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}
