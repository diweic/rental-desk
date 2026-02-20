// Calendar page — main/index page of the app at /<locale>/<clientId>
// View-only: shows device occupancy on a monthly FullCalendar.
import CalendarView from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <div className="py-4">
      <CalendarView />
    </div>
  );
}
