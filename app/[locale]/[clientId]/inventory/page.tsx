// Inventory page — CRUD for camera bodies and lenses.
// Uses client components for interactivity; no server-side data fetch needed
// (TanStack Query handles fetching from /api/devices on the client).
import DeviceForm from "@/components/inventory/DeviceForm";
import DeviceList from "@/components/inventory/DeviceList";

export default function InventoryPage() {
  return (
    <div className="py-4 space-y-4">
      <h2 className="text-base font-bold text-gray-800 pl-1 border-l-4 border-amber-400">
        Inventory
      </h2>

      {/* Add device form */}
      <DeviceForm />

      {/* All devices list */}
      <DeviceList />
    </div>
  );
}
