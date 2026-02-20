// API Route: POST /api/admin/login
// Verifies username + password against admin_credentials table.
// Sets an HttpOnly session cookie on success.

import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { sanitizeText } from "@/lib/validation";
import { getDb } from "@/lib/get-db";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json() as Record<string, unknown>;

    const username = sanitizeText(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Look up the admin by username
    const admin = await db
      .prepare("SELECT username, password_hash FROM admin_credentials WHERE username = ?")
      .bind(username)
      .first<{ username: string; password_hash: string }>();

    if (!admin) {
      // Return the same generic error to avoid username enumeration
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password against bcrypt hash
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set the session cookie (HttpOnly, lax, 8h TTL)
    await setSessionCookie(admin.username);

    return NextResponse.json({ success: true, username: admin.username });
  } catch (err) {
    console.error("[POST /api/admin/login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// POST /api/admin/logout — clears the session cookie
export async function DELETE() {
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
