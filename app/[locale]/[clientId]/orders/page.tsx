"use client";

// Orders page — tab-based, URL stays at /orders throughout.
// Three tabs: Past Orders | New Concert | New Order

import { useState } from "react";
import PastOrdersTab from "@/components/orders/PastOrdersTab";
import CreateConcertTab from "@/components/orders/CreateConcertTab";
import CreateOrderTab from "@/components/orders/CreateOrderTab";

type Tab = "past" | "concert" | "order";

const TABS: { id: Tab; label: string }[] = [
  { id: "past", label: "Past Orders" },
  { id: "concert", label: "New Concert" },
  { id: "order", label: "New Order" },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("past");

  return (
    <div className="py-4">
      <h2 className="text-base font-bold text-gray-800 mb-3 pl-1 border-l-4 border-blue-500">
        Orders
      </h2>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4 gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — only one renders at a time */}
      {activeTab === "past" && <PastOrdersTab />}
      {activeTab === "concert" && <CreateConcertTab />}
      {activeTab === "order" && <CreateOrderTab />}
    </div>
  );
}
