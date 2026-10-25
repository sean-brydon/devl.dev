import { type AgendaCalendar, type AgendaEvent, WeekAgenda } from "@/registry/items/week-agenda/week-agenda";

const calendars: AgendaCalendar[] = [
  { id: "work", name: "Work", tone: "info" },
  { id: "customers", name: "Customers", tone: "success" },
  { id: "personal", name: "Personal", tone: "neutral" },
];

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

const events: AgendaEvent[] = [
  { id: "e1", title: "Team standup", calendarId: "work", start: at(21, 9), end: at(21, 9, 30) },
  { id: "e2", title: "Roadmap review", calendarId: "work", start: at(21, 10), end: at(21, 11), location: "Room 4B" },
  {
    id: "e3",
    title: "Fernhill onboarding call",
    calendarId: "customers",
    start: at(21, 11, 30),
    end: at(21, 12, 30),
    location: "Video call",
  },
  { id: "e4", title: "Lunch with Mara", calendarId: "personal", start: at(21, 12, 15), end: at(21, 13, 15) },
  {
    id: "e5",
    title: "Pricing page copy",
    calendarId: "work",
    start: at(21, 14),
    end: at(21, 15, 30),
    location: "Focus time",
  },
  { id: "e6", title: "Quarterly check-in: Arbor & Pine", calendarId: "customers", start: at(21, 16), end: at(21, 16, 45) },
  { id: "e7", title: "Design crit", calendarId: "work", start: at(19, 15), end: at(19, 16) },
  { id: "e8", title: "Dentist", calendarId: "personal", start: at(20, 8, 30), end: at(20, 9, 30) },
  { id: "e9", title: "Renewal call: Lumen Labs", calendarId: "customers", start: at(22, 10), end: at(22, 10, 45) },
  { id: "e10", title: "Sprint planning", calendarId: "work", start: at(22, 13), end: at(22, 14) },
  { id: "e11", title: "Demo day", calendarId: "work", start: at(23, 16), end: at(23, 17, 30) },
  { id: "e12", title: "Climbing", calendarId: "personal", start: at(23, 18), end: at(23, 19) },
];

export default function WeekAgendaDemo() {
  return <WeekAgenda calendars={calendars} events={events} now={at(21, 11, 10)} />;
}
