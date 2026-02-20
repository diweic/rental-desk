"use client";

// List of all devices with delete action.
// Groups bodies and lenses separately for clarity.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { DeviceAsset } from "@/lib/db";

async function fetchDevices(): Promise<DeviceAsset[]> {
  const res = await fetch("/api/devices");
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export default function DeviceList() {
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading, isError } = useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
  });

  const deleteMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const res = await fetch(`/api/devices/${deviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete device");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const handleDelete = (device: DeviceAsset) => {
    if (!confirm(`Delete "${device.device_name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(device.device_id);
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400 text-center py-6 animate-pulse">Loading devices…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500 text-center py-4">Failed to load devices.</p>;
  }

  if (devices.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No devices yet. Add a camera body or lens above.
      </p>
    );
  }

  const bodies = devices.filter((d) => d.device_type === "camerabody");
  const lenses = devices.filter((d) => d.device_type === "lense");

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-700">Device Inventory</span>
        <span className="text-xs text-gray-400">{devices.length} total</span>
      </div>

      {bodies.length > 0 && (
        <DeviceGroup label="Camera Bodies" devices={bodies} onDelete={handleDelete} />
      )}
      {lenses.length > 0 && (
        <DeviceGroup label="Lenses" devices={lenses} onDelete={handleDelete} />
      )}
    </div>
  );
}

function DeviceGroup({
  label,
  devices,
  onDelete,
}: {
  label: string;
  devices: DeviceAsset[];
  onDelete: (d: DeviceAsset) => void;
}) {
  return (
    <div>
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <ul className="divide-y divide-gray-50">
        {devices.map((device) => (
          <li
            key={device.device_id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {/* Color swatch */}
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: device.color }}
              />
              <span className="text-sm text-gray-800">{device.device_name}</span>
            </div>
            <button
              onClick={() => onDelete(device)}
              className="text-gray-300 hover:text-red-400 transition-colors p-1"
              title="Delete device"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
