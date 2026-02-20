// API Route: /api/admin/urls/[id]
// PATCH  — update label or toggle is_active
// DELETE — permanently remove a client URL record

import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { sanitizeText } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const db = await getDb(request);
    const { id } = await params;
    const urlId = parseInt(id, 10);

    if (!Number.isFinite(urlId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (body.label !== undefined) {
      const label = sanitizeText(body.label);
      if (!label) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
      fields.push("label = ?");
      values.push(label);
    }
    if (body.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(urlId);
    const result = await db
      .prepare(`UPDATE client_urls SET ${fields.join(", ")} WHERE id = ? RETURNING *`)
      .bind(...values)
      .first();

    if (!result) return NextResponse.json({ error: "URL not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/admin/urls/[id]]", err);
    return NextResponse.json({ error: "Failed to update URL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const db = await getDb(request);
    const { id } = await params;
    const urlId = parseInt(id, 10);

    if (!Number.isFinite(urlId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await db.prepare("DELETE FROM client_urls WHERE id = ?").bind(urlId).run();
    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/admin/urls/[id]]", err);
    return NextResponse.json({ error: "Failed to delete URL" }, { status: 500 });
  }
}
