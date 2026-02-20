// Occupancy calculation logic.
// Determines the actual device occupation date range based on the rental
// dates and the chosen occupy_mode / buffer settings.

import type { OccupyMode } from "./db";

interface OccupancyInput {
  startDate: string;    // rental start, 'YYYY-MM-DD'
  endDate: string;      // rental end,   'YYYY-MM-DD'
  occupyMode: OccupyMode;
  bufferDaysBefore: number; // used for 'custom' and 'shipping' modes
  bufferDaysAfter: number;
}

interface OccupancyResult {
  occupiedStart: string;  // adjusted start date
  occupiedEnd: string;    // adjusted end date
  occupiedDates: string[]; // every individual date in the occupied range
}

// Add `offsetDays` days to an ISO date string, returns new ISO date string.
function addDays(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Generate every date between start and end (inclusive) as 'YYYY-MM-DD' strings.
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

// Resolve the actual pre/post buffer days for a given mode.
function resolveBuffers(
  mode: OccupyMode,
  bufferDaysBefore: number,
  bufferDaysAfter: number
): { pre: number; post: number } {
  switch (mode) {
    case "safe":
      // +1 day buffer on each side
      return { pre: 1, post: 1 };
    case "aggressive":
      // Exact rental dates only — no buffer
      return { pre: 0, post: 0 };
    case "custom":
      // User-defined buffer
      return { pre: bufferDaysBefore, post: bufferDaysAfter };
    case "shipping":
      // Transit days used as buffer on both sides
      return { pre: bufferDaysBefore, post: bufferDaysAfter };
  }
}

// Main export: compute the full occupation window for an order.
export function calculateOccupancy(input: OccupancyInput): OccupancyResult {
  const { startDate, endDate, occupyMode, bufferDaysBefore, bufferDaysAfter } =
    input;

  const { pre, post } = resolveBuffers(
    occupyMode,
    bufferDaysBefore,
    bufferDaysAfter
  );

  const occupiedStart = addDays(startDate, -pre);
  const occupiedEnd = addDays(endDate, post);
  const occupiedDates = dateRange(occupiedStart, occupiedEnd);

  return { occupiedStart, occupiedEnd, occupiedDates };
}
