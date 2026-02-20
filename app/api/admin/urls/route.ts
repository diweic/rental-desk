// API Route: /api/admin/urls
// GET  — list all issued client URLs
// POST — issue a new client URL

import { type NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { generateClientId } from "@/lib/clientId";
import { sanitizeText, isValidLocationType } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

// GET /api/admin/urls — list all issued URLs (newest first)
export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const db = await getDb();

    const { results } = await db
      .prepare("SELECT * FROM client_urls ORDER BY created_at DESC")
      .all();

    return NextResponse.json(results);
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/admin/urls]", err);
    return NextResponse.json({ error: "Failed to fetch URLs" }, { status: 500 });
  }
}

// POST /api/admin/urls — issue a new client URL
// Body: { label: string, locale?: string }
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const db = await getDb();

    const body = await request.json() as Record<string, unknown>;
    const label = sanitizeText(body.label);
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const locale = isValidLocationType(body.locale) ? body.locale as string : "en-us";

    // Generate a unique 16-char clientId — retry if collision (extremely rare)
    let clientId = generateClientId();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db
        .prepare("SELECT id FROM client_urls WHERE client_id = ?")
        .bind(clientId)
        .first();
      if (!existing) break;
      clientId = generateClientId();
      attempts++;
    }

    const result = await db
      .prepare(
        `INSERT INTO client_urls (client_id, label, locale)
         VALUES (?, ?, ?) RETURNING *`
      )
      .bind(clientId, label, locale)
      .first();

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/admin/urls]", err);
    return NextResponse.json({ error: "Failed to issue URL" }, { status: 500 });
  }
}
