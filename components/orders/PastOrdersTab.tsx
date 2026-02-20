"use client";

// Tab: Past Orders
// Lists all orders grouped by concert with per-concert subtotals.
// Shows 3 global metrics at the top: total net income, total revenue, total fees.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

const PLATFORM_FEE_RATE = 0.032;

// Shape of a single order row from GET /api/orders (joined with concert + devices).
interface OrderRow {
  order_id: number;
  concert_id: number;
  concert_title: string;
  start_date: string;
  end_date: string;
  camerabody_name: string | null;
  camerabody_color: string | null;
  lense_name: string | null;
  lense_color: string | null;
  daily_rate: number;
  shipping_fee: number;
  intern_fee: number;
  occupy_mode: string;
  notes: string | null;
}

async function fetchOrders(): Promise<OrderRow[]> {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

// Calculate derived financials for a single order.
function calcFinancials(order: OrderRow) {
  const days =
    Math.floor(
      (new Date(order.end_date).getTime() - new Date(order.start_date).getTime()) / 86400000
    ) + 1;
  const revenue = order.daily_rate * days;
  const platformFee = revenue * PLATFORM_FEE_RATE;
  const totalFees = platformFee + order.shipping_fee + order.intern_fee;
  const net = revenue - totalFees;
  return { revenue, platformFee, totalFees, net, days };
}

export default function PastOrdersTab() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["occupied-dates"] });
    },
  });

  const handleDelete = (order: OrderRow) => {
    const label = [order.camerabody_name, order.lense_name].filter(Boolean).join(" + ") || "order";
    if (!confirm(`Delete this order (${label}, ${order.start_date})? This cannot be undone.`))
      return;
    deleteMutation.mutate(order.order_id);
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400 text-center py-8 animate-pulse">Loading orders…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-500 text-center py-4">Failed to load orders.</p>;
  }
  if (orders.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No orders yet. Create one in the "New Order" tab.
      </p>
    );
  }

  // ── Global metrics ──────────────────────────────────────────────────────────
  let globalRevenue = 0, globalFees = 0, globalNet = 0;
  orders.forEach((o) => {
    const f = calcFinancials(o);
    globalRevenue += f.revenue;
    globalFees += f.totalFees;
    globalNet += f.net;
  });

  // ── Group by concert ────────────────────────────────────────────────────────
  const groups = new Map<string, { concertTitle: string; orders: OrderRow[]; net: number }>();
  orders.forEach((o) => {
    const key = String(o.concert_id);
    if (!groups.has(key)) {
      groups.set(key, { concertTitle: o.concert_title, orders: [], net: 0 });
    }
    const g = groups.get(key)!;
    g.orders.push(o);
    g.net += calcFinancials(o).net;
  });

  return (
    <div className="space-y-4">
      {/* Global metrics */}
      <div className="bg-blue-600 text-white rounded-xl p-4">
        <div className="grid grid-cols-3 text-center gap-2">
          <Metric label="Net Income" value={globalNet} />
          <Metric label="Revenue" value={globalRevenue} />
          <Metric label="Total Fees" value={globalFees} />
        </div>
        <p className="text-center text-blue-200 text-xs mt-2">
          {orders.length} order{orders.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Concert groups */}
      {Array.from(groups.entries()).map(([key, group]) => (
        <div key={key} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-gray-800 text-sm">{group.concertTitle}</span>
            <span className="text-xs text-green-600 font-medium">
              Net: ¥{group.net.toFixed(0)}
            </span>
          </div>

          <ul className="divide-y divide-gray-50">
            {group.orders.map((order) => {
              const { revenue, platformFee, net, days } = calcFinancials(order);
              const deviceParts = [
                order.camerabody_name && { name: order.camerabody_name, color: order.camerabody_color },
                order.lense_name && { name: order.lense_name, color: order.lense_color },
              ].filter(Boolean) as { name: string; color: string | null }[];

              return (
                <li key={order.order_id} className="px-4 py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Device names with color swatches */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {deviceParts.map((d, i) => (
                          <span key={i} className="flex items-center gap-1 text-sm font-medium text-gray-800">
                            {d.color && (
                              <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0 inline-block"
                                style={{ backgroundColor: d.color }}
                              />
                            )}
                            {d.name}
                            {i < deviceParts.length - 1 && <span className="text-gray-300">+</span>}
                          </span>
                        ))}
                      </div>

                      <div className="text-xs text-gray-400">
                        {order.start_date} → {order.end_date}
                        <span className="mx-1">·</span>
                        {days}d
                        <span className="mx-1">·</span>
                        ¥{order.daily_rate}/day
                        {order.notes && (
                          <>
                            <span className="mx-1">·</span>
                            <span className="italic text-gray-400">{order.notes}</span>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 mt-0.5">
                        Revenue: ¥{revenue.toFixed(0)}
                        <span className="text-gray-300 mx-1">|</span>
                        Fee: ¥{platformFee.toFixed(0)}
                        {order.shipping_fee > 0 && ` + ¥${order.shipping_fee} ship`}
                        {order.intern_fee > 0 && ` + ¥${order.intern_fee} intern`}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-sm font-bold ${net >= 0 ? "text-green-600" : "text-red-500"}`}>
                        ¥{net.toFixed(0)}
                      </span>
                      <button
                        onClick={() => handleDelete(order)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Delete order"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-bold">¥{value.toFixed(0)}</div>
      <div className="text-xs text-blue-200">{label}</div>
    </div>
  );
}
