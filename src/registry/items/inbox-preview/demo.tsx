import { type InboxLabel, InboxPreview } from "@/registry/items/inbox-preview/inbox-preview";

const work: InboxLabel = { name: "Work", tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300" };
const finance: InboxLabel = { name: "Finance", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" };
const travel: InboxLabel = { name: "Travel", tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300" };
const team: InboxLabel = { name: "Team", tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300" };

export default function InboxPreviewDemo() {
  return (
    <div className="p-4 sm:p-8">
      <InboxPreview
        emails={[
          {
            id: "m1",
            from: { name: "Lena Marsh", email: "lena@kiln.studio", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
            subject: "Homepage hero: two directions",
            snippet: "I mocked up both — the calmer one tested better with the five people I grabbed…",
            body: [
              "Hi Theo,",
              "I mocked up both hero directions we talked about on Tuesday. The calmer one, with the product shot on the right, tested better with the five people I grabbed in the kitchen: they found the sign-up button faster and two of them actually read the subhead.",
              "The bolder one is more fun, though. If we keep it, I'd drop the gradient and lean on the illustration instead. Can we pick one by Thursday so engineering can start on Monday?",
              "Lena",
            ],
            time: "9:42",
            date: "Fri, Oct 24, 9:42 AM",
            unread: true,
            labels: [work],
            attachment: { name: "hero-directions.fig", size: "4.2 MB" },
          },
          {
            id: "m2",
            from: { name: "Northbank Payroll", email: "no-reply@northbank.co", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
            subject: "Your October payslip is ready",
            snippet: "Net pay of $6,412.80 will arrive on Oct 31. View the breakdown in the portal.",
            body: [
              "Your payslip for October 2026 is ready.",
              "Net pay of $6,412.80 will be deposited on Friday, October 31. You can view the full breakdown, including the new pension contribution, in the Northbank portal.",
            ],
            time: "8:15",
            date: "Fri, Oct 24, 8:15 AM",
            unread: true,
            labels: [finance],
          },
          {
            id: "m3",
            from: { name: "Ravi Iyer", email: "ravi@kiln.studio", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
            subject: "Re: Offsite agenda",
            snippet: "Moved the retro to Wednesday morning so people aren't fried. Added a hike slot.",
            body: [
              "Moved the retro to Wednesday morning so people aren't fried after the travel day. I also added a two-hour hike slot on Thursday afternoon; it's optional but the trail is lovely.",
              "Shout if you want anything else on the list.",
            ],
            time: "Yesterday",
            date: "Thu, Oct 23, 5:02 PM",
            unread: true,
            labels: [team],
          },
          {
            id: "m4",
            from: { name: "Skylark Air", email: "trips@skylark.air", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
            subject: "Check-in is open for Lisbon",
            snippet: "Flight SK 218 departs Nov 3 at 07:40. Choose your seat before it fills up.",
            body: [
              "Check-in is now open for your flight to Lisbon.",
              "SK 218 departs on Monday, November 3 at 07:40 from Terminal 2. Choose your seat now; window seats on the left side get the best view of the coast on approach.",
            ],
            time: "Yesterday",
            date: "Thu, Oct 23, 11:20 AM",
            labels: [travel],
          },
          {
            id: "m5",
            from: { name: "Maya Chen", email: "maya@kiln.studio", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
            subject: "Quick favour",
            snippet: "Could you look over the client proposal before 3? Mostly the pricing page.",
            body: ["Could you look over the client proposal before 3? Mostly the pricing page; I'm not sure the tiers make sense yet.", "Thank you!"],
            time: "Wed",
            date: "Wed, Oct 22, 1:47 PM",
            labels: [work],
          },
          {
            id: "m6",
            from: { name: "Juno Okafor", email: "juno@kiln.studio" },
            subject: "Lunch on Friday?",
            snippet: "The new ramen place on Elm opened. I'll book for four unless you object.",
            body: ["The new ramen place on Elm finally opened. I'll book for four at 12:30 unless you object."],
            time: "Tue",
            date: "Tue, Oct 21, 10:05 AM",
          },
        ]}
        me="Theo Brandt"
      />
    </div>
  );
}
