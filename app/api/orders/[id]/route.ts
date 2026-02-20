// API Route: /api/orders/[id]
// DELETE — remove an order; cascades to device_calendar + occupied_dates via FK ON DELETE CASCADE.

import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/get-db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (!Number.isFinite(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const existing = await db
      .prepare("SELECT order_id FROM rental_orders WHERE order_id = ?")
      .bind(orderId)
      .first();

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // CASCADE handles device_calendar + occupied_dates deletion automatically.
    await db
      .prepare("DELETE FROM rental_orders WHERE order_id = ?")
      .bind(orderId)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/orders/[id]]", err);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
