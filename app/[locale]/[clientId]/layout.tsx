// clientId layout — validates that the clientId exists before rendering any page.
// Wraps all app pages (calendar, orders, inventory) with the shared shell:
// fixed Header on top, BottomNav on bottom, page content in between.
//
// Validation logic:
//   'example'            → always valid (guest access / demo)
//   16-char alphanumeric → checked against client_urls table in D1 (must be active)
//   anything else        → 404 immediately (fast-path, no DB hit)

import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import { isValidClientIdFormat } from "@/lib/clientId";

// Validate the clientId against D1.
// Returns true if the clientId is allowed to access the app.
async function isValidClientId(clientId: string): Promise<boolean> {
  // 'example' is always valid — used as the guest/demo URL.
  if (clientId === "example") return true;

  // Reject obviously invalid formats without hitting the DB.
  if (!isValidClientIdFormat(clientId)) return false;

  // In local `next dev`, the D1 binding isn't available — treat all
  // valid-format IDs as allowed so development stays easy.
  // In production (Cloudflare Workers), the DB binding IS available.
  try {
    // Access the D1 binding via the global env injected by Cloudflare runtime.
    // This won't exist in local Next.js dev — caught by the try/catch below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: D1Database = (globalThis as any).__env__?.DB;
    if (!db) {
      // Local dev: no D1 binding available — allow all valid-format IDs.
      return true;
    }

    const row = await db
      .prepare(
        "SELECT id FROM client_urls WHERE client_id = ? AND is_active = 1"
      )
      .bind(clientId)
      .first();

    return row !== null;
  } catch {
    // If D1 is unavailable (local dev), fail open to allow development.
    return true;
  }
}

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { clientId } = await params;

  const valid = await isValidClientId(clientId);
  if (!valid) {
    notFound();
  }

  return (
    <>
      {/* Fixed top header */}
      <Header />

      {/* Main content — offset by header height (48px = h-12) */}
      <main className="pt-12 min-h-screen max-w-lg mx-auto px-4">
        {children}
      </main>

      <Footer />

      {/* Fixed bottom nav */}
      <BottomNav />
    </>
  );
}
