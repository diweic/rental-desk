// Admin authentication helpers.
// Uses a simple signed session token stored in an HttpOnly cookie.
// The token is a base64-encoded JSON payload signed with HMAC-SHA256.
// No external JWT library needed — keeps the bundle small.

import { cookies } from "next/headers";

const SESSION_COOKIE = "admin_session";
// Secret used to sign session tokens. In production this should be in an env var.
// For now we use a hardcoded secret — acceptable for a single-admin internal tool.
const SECRET = process.env.ADMIN_SECRET ?? "rental-admin-secret-change-in-prod";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface SessionPayload {
  username: string;
  exp: number; // expiry timestamp in ms
}

// ── Signing ──────────────────────────────────────────────────────────────────

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(data: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(data);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ── Token creation / parsing ─────────────────────────────────────────────────

export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await hmacSign(data);
  return `${data}.${sig}`;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const valid = await hmacVerify(data, sig);
  if (!valid) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString()
    ) as SessionPayload;
    if (Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers (server-side only) ────────────────────────────────────────

export async function setSessionCookie(username: string): Promise<void> {
  const token = await createSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    // secure: true — enable in production (requires HTTPS)
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Returns the session payload if the admin is logged in, or null otherwise.
export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Use in API routes to guard admin endpoints.
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
