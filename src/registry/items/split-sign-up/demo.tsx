import { SplitSignUp } from "@/registry/items/split-sign-up/split-sign-up";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function SplitSignUpDemo() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <SplitSignUp
        checkEmail={async (email) => {
          await wait(700);
          return email.toLowerCase() === "ada@harborline.co";
        }}
        onSubmit={() => wait(1100)}
        quotes={[
          {
            quote: "We moved bookings, waitlists and reminders into Tidewell in an afternoon. No-shows dropped by a third in the first month.",
            name: "Priya Raman",
            role: "Owner, Saltgrass Kitchen",
            tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          },
          {
            quote: "Our hosts stopped juggling three tabs. The floor plan view alone paid for the year.",
            name: "Tomás Ferreira",
            role: "GM, Little Harbour",
            tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
          },
          {
            quote: "Setup took twenty minutes and the weekly report is the first email I open on Mondays.",
            name: "Hana Okafor",
            role: "Operations, Driftwood Group",
            tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          },
        ]}
      />
    </div>
  );
}
