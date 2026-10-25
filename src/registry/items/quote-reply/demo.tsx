import { QuoteReply } from "@/registry/items/quote-reply/quote-reply";

const ana = { id: "ana", name: "Ana Ruiz", initials: "AR", avatarClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" };
const leo = { id: "leo", name: "Leo Brandt", initials: "LB", avatarClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
const sam = { id: "sam", name: "Sam Okafor", initials: "SO", avatarClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" };
const me = { id: "me", name: "Mara Lind", initials: "ML", avatarClassName: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" };

export default function QuoteReplyDemo() {
  return (
    <QuoteReply
      currentUser={me}
      messages={[
        {
          id: "m1",
          author: ana,
          time: "9:12",
          text: "I'd drop the onboarding checklist entirely. Fewer than one in five people finish it, and the ones who do don't stick around any longer.",
        },
        {
          id: "m2",
          author: leo,
          time: "9:20",
          text: "It's still where most teams connect their calendar, though. Connected teams churn at half the rate, so I'd hate to bury that step.",
        },
        {
          id: "m3",
          author: sam,
          time: "9:24",
          text: "Could we keep only the calendar step and move everything else into empty states?",
        },
      ]}
      title="Onboarding review"
    />
  );
}
