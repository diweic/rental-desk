"use client";

// Tab: Create Concert
// Standalone form — no relation to order creation.
// User fills in concert details and submits.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateConcertTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [locationType, setLocationType] = useState<"local" | "remote">("local");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/concerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          location_type: locationType,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to create concert");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate concerts list so "Create Order" dropdown refreshes.
      queryClient.invalidateQueries({ queryKey: ["concerts"] });
      setTitle("");
      setStartDate("");
      setEndDate("");
      setError("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!title.trim()) { setError("Concert name is required."); return; }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (startDate > endDate) { setError("End date must be on or after start date."); return; }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border-t-4 border-blue-500">
        <h3 className="font-semibold text-blue-700 text-sm">Create Concert Event</h3>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Concert Name</label>
          <input
            type="text"
            placeholder="e.g. Mayday Xiamen Tour"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Fulfillment Type</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setLocationType("local")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                locationType === "local"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              📍 Local
            </button>
            <button
              type="button"
              onClick={() => setLocationType("remote")}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                locationType === "remote"
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              📦 Remote (Shipping)
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Concert Dates</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && (
          <p className="text-xs text-green-600 font-medium">
            ✓ Concert created successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {mutation.isPending ? "Creating…" : "Create Concert"}
        </button>
      </div>
    </form>
  );
}
