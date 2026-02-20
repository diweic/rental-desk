"use client";

// Tab: Create Rental Order
// User picks a concert, dates, occupancy mode, devices, and pricing.
// Real-time conflict detection shows which devices are available.
// Real-time price calculator shows net income as user types.

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConcertCalendar, DeviceAsset } from "@/lib/db";
import { calculateOccupancy } from "@/lib/occupancy";

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchConcerts(): Promise<ConcertCalendar[]> {
  const res = await fetch("/api/concerts");
  if (!res.ok) throw new Error("Failed to fetch concerts");
  return res.json();
}

async function fetchDevices(): Promise<DeviceAsset[]> {
  const res = await fetch("/api/devices");
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

async function fetchOccupiedDates(deviceIds: number[]): Promise<{ device_id: number; date: string }[]> {
  if (deviceIds.length === 0) return [];
  const params = deviceIds.map((id) => `deviceId=${id}`).join("&");
  const res = await fetch(`/api/availability?${params}`);
  if (!res.ok) return [];
  return res.json();
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FEE_RATE = 0.032; // 3.2%

// ── Component ────────────────────────────────────────────────────────────────

export default function CreateOrderTab() {
  const queryClient = useQueryClient();

  // Form state
  const [concertId, setConcertId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [occupyMode, setOccupyMode] = useState<"safe" | "aggressive" | "custom" | "shipping">("safe");
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [selectedBody, setSelectedBody] = useState<number | "">("");
  const [selectedLens, setSelectedLens] = useState<number | "">("");
  const [dailyRate, setDailyRate] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [internFee, setInternFee] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load concerts and devices
  const { data: concerts = [] } = useQuery({ queryKey: ["concerts"], queryFn: fetchConcerts });
  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: fetchDevices });

  const bodies = useMemo(() => devices.filter((d) => d.device_type === "camerabody"), [devices]);
  const lenses = useMemo(() => devices.filter((d) => d.device_type === "lense"), [devices]);

  // Selected concert details (for date validation and mode hints)
  const selectedConcert = concerts.find((c) => c.concert_id === concertId);

  // Default occupy mode based on concert location type
  useEffect(() => {
    if (!selectedConcert) return;
    setOccupyMode(selectedConcert.location_type === "remote" ? "shipping" : "safe");
  }, [selectedConcert]);

  // Compute required occupied dates for the current form state (client-side preview).
  const occupiedDatesForForm = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      return calculateOccupancy({
        startDate,
        endDate,
        occupyMode,
        bufferDaysBefore: occupyMode === "safe" ? 1 : occupyMode === "aggressive" ? 0 : bufferBefore,
        bufferDaysAfter: occupyMode === "safe" ? 1 : occupyMode === "aggressive" ? 0 : bufferAfter,
      }).occupiedDates;
    } catch {
      return [];
    }
  }, [startDate, endDate, occupyMode, bufferBefore, bufferAfter]);

  // Fetch all occupied dates for all devices to power conflict UI.
  const allDeviceIds = devices.map((d) => d.device_id);
  const { data: allOccupied = [] } = useQuery({
    queryKey: ["occupied-dates", allDeviceIds],
    queryFn: () => fetchOccupiedDates(allDeviceIds),
    enabled: allDeviceIds.length > 0,
  });

  // For each device, check if it conflicts with the current form's occupied dates.
  function isConflicting(deviceId: number): boolean {
    if (occupiedDatesForForm.length === 0) return false;
    return allOccupied.some(
      (od) => od.device_id === deviceId && occupiedDatesForForm.includes(od.date)
    );
  }

  // ── Pricing calculation (real-time) ────────────────────────────────────────

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return 0;
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.floor(ms / 86400000) + 1;
  }, [startDate, endDate]);

  const revenue = (parseFloat(dailyRate) || 0) * rentalDays;
  const platformFee = revenue * PLATFORM_FEE_RATE;
  const totalFees = platformFee + (parseFloat(shippingFee) || 0) + (parseFloat(internFee) || 0);
  const netIncome = revenue - totalFees;

  // ── Submit ─────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concert_id: concertId,
          start_date: startDate,
          end_date: endDate,
          camerabody_id: selectedBody || null,
          lense_id: selectedLens || null,
          daily_rate: parseFloat(dailyRate) || 0,
          shipping_fee: parseFloat(shippingFee) || 0,
          intern_fee: parseFloat(internFee) || 0,
          occupy_mode: occupyMode,
          buffer_days_before:
            occupyMode === "safe" ? 1 : occupyMode === "aggressive" ? 0 : bufferBefore,
          buffer_days_after:
            occupyMode === "safe" ? 1 : occupyMode === "aggressive" ? 0 : bufferAfter,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["occupied-dates"] });
      // Reset form
      setStartDate(""); setEndDate("");
      setSelectedBody(""); setSelectedLens("");
      setDailyRate(""); setShippingFee(""); setInternFee("");
      setNotes(""); setError("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!concertId) { setError("Please select a concert."); return; }
    if (!startDate || !endDate) { setError("Rental dates are required."); return; }
    if (startDate > endDate) { setError("End date must be on or after start date."); return; }
    if (!selectedBody && !selectedLens) { setError("Select at least one device."); return; }
    mutation.mutate();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 border-t-4 border-green-500">
        <h3 className="font-semibold text-green-700 text-sm">Create Rental Order</h3>

        {/* Concert picker */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Concert</label>
          <select
            value={concertId}
            onChange={(e) => setConcertId(e.target.value ? parseInt(e.target.value) : "")}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          >
            <option value="">— Select a concert —</option>
            {concerts.map((c) => (
              <option key={c.concert_id} value={c.concert_id}>
                {c.title} ({c.start_date} → {c.end_date})
              </option>
            ))}
          </select>
          {concerts.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">
              No concerts yet — create one in the "New Concert" tab first.
            </p>
          )}
        </div>

        {/* Rental dates */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Rental Period
            {rentalDays > 0 && (
              <span className="text-blue-500 ml-2">{rentalDays} day{rentalDays !== 1 ? "s" : ""}</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              min={selectedConcert?.start_date}
              max={selectedConcert?.end_date}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <span className="text-gray-400 text-sm shrink-0">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate || selectedConcert?.start_date}
              max={selectedConcert?.end_date}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {/* Occupancy mode */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Device Occupancy Mode</label>
          {selectedConcert?.location_type === "local" ? (
            <div className="space-y-2">
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
                {(["safe", "aggressive", "custom"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setOccupyMode(mode)}
                    className={`flex-1 py-1.5 font-medium transition-colors capitalize border-r last:border-r-0 border-gray-200 ${
                      occupyMode === mode
                        ? mode === "safe" ? "bg-green-600 text-white"
                          : mode === "aggressive" ? "bg-red-500 text-white"
                          : "bg-gray-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "safe" ? "Safe +1d" : mode === "aggressive" ? "Exact" : "Custom"}
                  </button>
                ))}
              </div>
              {occupyMode === "custom" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Days before</label>
                    <input
                      type="number"
                      min={0}
                      value={bufferBefore}
                      onChange={(e) => setBufferBefore(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Days after</label>
                    <input
                      type="number"
                      min={0}
                      value={bufferAfter}
                      onChange={(e) => setBufferAfter(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Remote: shipping transit days
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                📦 Remote shipping — transit days added as buffer on each side.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Transit days (before)</label>
                  <input
                    type="number"
                    min={1}
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Transit days (after)</label>
                  <input
                    type="number"
                    min={1}
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Device selectors */}
        <div className="grid grid-cols-2 gap-3">
          <DeviceSelector
            label="Camera Body"
            devices={bodies}
            value={selectedBody}
            onChange={setSelectedBody}
            isConflicting={isConflicting}
            datesSelected={occupiedDatesForForm.length > 0}
          />
          <DeviceSelector
            label="Lens"
            devices={lenses}
            value={selectedLens}
            onChange={setSelectedLens}
            isConflicting={isConflicting}
            datesSelected={occupiedDatesForForm.length > 0}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
          <input
            type="text"
            placeholder="Customer name, contact info, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Daily Rate</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Shipping Fee</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Intern Fee</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={internFee}
                onChange={(e) => setInternFee(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* Real-time price breakdown */}
          {revenue > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 flex justify-between">
              <span>
                Revenue: <strong>¥{revenue.toFixed(0)}</strong>
                <span className="text-gray-400 ml-1">
                  (3.2% fee: ¥{platformFee.toFixed(0)})
                </span>
              </span>
              <span className={`font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>
                Net: ¥{netIncome.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && (
          <p className="text-xs text-green-600 font-medium">✓ Order created successfully!</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-colors"
        >
          {mutation.isPending ? "Submitting…" : "Submit Order"}
        </button>
      </div>
    </form>
  );
}

// ── Sub-component: Device selector with availability indicators ───────────────

function DeviceSelector({
  label,
  devices,
  value,
  onChange,
  isConflicting,
  datesSelected,
}: {
  label: string;
  devices: DeviceAsset[];
  value: number | "";
  onChange: (v: number | "") => void;
  isConflicting: (id: number) => boolean;
  datesSelected: boolean;
}) {
  const available = datesSelected ? devices.filter((d) => !isConflicting(d.device_id)) : devices;

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 flex justify-between">
        <span>{label}</span>
        {datesSelected && (
          <span className={available.length > 0 ? "text-green-500" : "text-red-400"}>
            {available.length} avail.
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : "")}
        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
      >
        <option value="">— None —</option>
        {devices.map((d) => {
          const conflict = datesSelected && isConflicting(d.device_id);
          return (
            <option key={d.device_id} value={d.device_id} disabled={conflict}>
              {d.device_name}
              {conflict ? " (occupied)" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
