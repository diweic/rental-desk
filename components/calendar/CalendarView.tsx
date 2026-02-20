"use client";

// FullCalendar monthly view showing device occupancy events.
// Events are color-coded by device color from device_asset.
// Clicking an event shows order details in a modal.

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

// Shape of data returned by GET /api/calendar
interface CalendarEvent {
  id: string;
  title: string;       // device name(s), e.g. "Sony A7IV + 70-200mm"
  start: string;       // occupied start date (with buffer)
  end: string;         // occupied end date (exclusive for FullCalendar)
  color: string;       // hex color of the device
  extendedProps: {
    concertTitle: string;
    rentalStart: string; // actual rental start (without buffer)
    rentalEnd: string;
    occupyMode: string;
    notes: string | null;
  };
}

// Fetch calendar events from the API.
async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const res = await fetch("/api/calendar");
  if (!res.ok) throw new Error("Failed to fetch calendar events");
  return res.json();
}

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: fetchCalendarEvents,
  });

  // Force FullCalendar to recalculate size after mount (avoids width glitches).
  useEffect(() => {
    setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 100);
  }, []);

  // Handle event click — show detail modal.
  const handleEventClick = (info: EventClickArg) => {
    const ev = events.find((e) => e.id === info.event.id);
    if (ev) setSelectedEvent(ev);
  };

  if (isError) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 text-center">
        Failed to load calendar. Please refresh.
      </div>
    );
  }

  // Map our API events to FullCalendar EventInput format.
  const fcEvents: EventInput[] = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: ev.start,
    // FullCalendar end date is exclusive — add 1 day so the event bar
    // visually covers the last occupied day.
    end: addOneDay(ev.end),
    backgroundColor: ev.color,
    borderColor: ev.color,
    extendedProps: ev.extendedProps,
  }));

  return (
    <section>
      <h2 className="text-base font-bold text-gray-800 mb-3 pl-1 border-l-4 border-blue-500">
        Device Calendar
      </h2>

      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm animate-pulse">
          Loading calendar…
        </div>
      ) : (
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            dayMaxEvents={3}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "today",
            }}
            events={fcEvents}
            eventClick={handleEventClick}
            eventDisplay="block"
          />
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-24"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color strip matching device color */}
            <div
              className="w-full h-1 rounded-full mb-4"
              style={{ backgroundColor: selectedEvent.color }}
            />

            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base pr-4">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <Row label="Concert" value={selectedEvent.extendedProps.concertTitle} />
              <Row label="Rental" value={`${selectedEvent.extendedProps.rentalStart} → ${selectedEvent.extendedProps.rentalEnd}`} />
              <Row label="Occupied" value={`${selectedEvent.start} → ${selectedEvent.end}`} />
              <Row label="Mode" value={selectedEvent.extendedProps.occupyMode} />
              {selectedEvent.extendedProps.notes && (
                <Row label="Notes" value={selectedEvent.extendedProps.notes} />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Small helper row for the detail modal.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

// Add one day to an ISO date string (for FullCalendar exclusive end date).
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}
