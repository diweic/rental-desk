"use client";

// Form to add a new device (camera body or lens).
// Generates a random vibrant color on mount; user can re-roll or pick their own.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shuffle } from "lucide-react";

// Generates a random vibrant hex color (mirrors server-side randomVibrantColor).
function randomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 30) + 60;
  const l = Math.floor(Math.random() * 20) + 40;
  // HSL → hex
  const lf = l / 100;
  const a = (s * Math.min(lf, 1 - lf)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lf - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface DeviceFormProps {
  onSuccess?: () => void;
}

export default function DeviceForm({ onSuccess }: DeviceFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"camerabody" | "lense">("camerabody");
  const [color, setColor] = useState(randomColor);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_name: name, device_type: type, color }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to add device");
      }
      return res.json();
    },
    onSuccess: () => {
      // Refresh the device list
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setName("");
      setColor(randomColor());
      setError("");
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Device name is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm p-4 space-y-3"
    >
      <h3 className="font-semibold text-gray-800 text-sm">Add Device</h3>

      {/* Name + Type row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Device name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "camerabody" | "lense")}
          className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="camerabody">Body</option>
          <option value="lense">Lens</option>
        </select>
      </div>

      {/* Color picker row */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
          title="Pick device color"
        />
        <span className="text-xs text-gray-500 font-mono flex-1">{color}</span>
        <button
          type="button"
          onClick={() => setColor(randomColor())}
          title="Random color"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Shuffle size={16} />
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        {mutation.isPending ? "Adding…" : "Add Device"}
      </button>
    </form>
  );
}
