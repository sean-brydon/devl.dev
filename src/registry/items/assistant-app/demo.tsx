import {
  BarChart3Icon,
  DatabaseIcon,
  LightbulbIcon,
  MailIcon,
  MegaphoneIcon,
  NotebookPenIcon,
  PresentationIcon,
  TagsIcon,
} from "lucide-react";
import { AssistantApp } from "@/registry/items/assistant-app/assistant-app";

const replies: { match: RegExp; text: string }[] = [
  {
    match: /objection|interview|summar/i,
    text: `Here's what came up across the five calls this week.

**Top pricing objections**
1. **Seat pricing feels punitive.** Three of five teams share logins to stay under the 10-seat tier.
2. **Annual-only discount.** Finance leads at Lumen & Co and Brightwater want quarterly billing.
3. **Overage is a black box.** Nobody could estimate their bill for a busy month.

**What they'd happily pay for**
- Usage-based add-ons for API calls
- A team plan between Starter and Business
- A spend cap with an alert at 80%

Want me to turn this into a one-page pricing proposal for Friday's review?`,
  },
  {
    match: /tier|compare/i,
    text: `Here's how we stack up against the three closest rivals.

- **Starter:** we're $4 cheaper per seat, but Quillmark includes 5 seats free.
- **Team (new):** nobody has a 10–25 seat plan; this is the gap interviewees described.
- **Business:** Fernwise matches our price and adds SSO, which we charge extra for.

**Suggestion:** bundle SSO into Business and launch Team at $14 a seat.`,
  },
  {
    match: /opening|one line|sentence/i,
    text: "**The quarter in one line:** revenue grew 18% while burn stayed flat, and the new usage add-on now pays for a third of our infrastructure.",
  },
  {
    match: /email|launch|announce/i,
    text: `Here's a short launch email you can tweak.

**Subject:** Tidepool 2.0 is here — and it's quieter

Hi {first_name},

Tidepool 2.0 ships today. We rebuilt the inbox so only the threads that need you float to the top, everything else waits politely.

- **Focus view** hides anything you're only cc'd on
- **Snooze to Monday** in one keystroke
- **Shared drafts** so your team can edit before you hit send

Update from the app menu, or reply to this email and tell us what you'd change.`,
  },
  {
    match: /sql|churn|query/i,
    text: `This counts accounts that cancelled each week, as a share of those active at the start of it.

\`\`\`
select date_trunc('week', cancelled_at) as week,
       count(*) filter (where cancelled_at is not null) as churned,
       round(100.0 * count(*) filter (where cancelled_at is not null)
             / nullif(count(*), 0), 1) as churn_pct
from accounts
where started_at < date_trunc('week', now())
group by 1
order by 1 desc
limit 12;
\`\`\`

Swap \`accounts\` for \`subscriptions\` if you want to count seats rather than teams.`,
  },
  {
    match: /deck|outline|board/i,
    text: `A tight outline for a 12-slide board update:

1. **The quarter in one line.** Revenue up 18%, burn flat.
2. **Three numbers that matter.** ARR, net retention, months of runway.
3. **What worked.** The usage add-on and the Brightwater expansion.
4. **What didn't.** Self-serve conversion slipped after the price change.
5. **Next quarter's bets.** Team plan, EU data residency, two senior hires.
6. **Asks.** Intros to two design partners in logistics.

I can draft speaker notes for each slide next.`,
  },
];

export default function AssistantAppDemo() {
  return (
    <div className="p-4 sm:p-8">
      <AssistantApp
        chats={[
          {
            id: "interviews",
            title: "Summarize customer interviews",
            group: "Today",
            projectId: "pricing",
            messages: [
              { id: "m1", role: "user", content: "Which interviews are in this project so far?" },
              {
                id: "m2",
                role: "assistant",
                content:
                  "Five, all from this week: **Lumen & Co**, **Brightwater**, **Pell Studio**, **Arcadia Freight** and **Okonkwo Labs**. Each has a transcript and a notes doc attached.",
              },
              {
                id: "m3",
                role: "user",
                content: "Summarize them and pull out the top pricing objections.",
              },
            ],
          },
          { id: "launch-email", title: "Launch email for Tidepool 2.0", group: "Today", projectId: "launch" },
          { id: "churn", title: "SQL for weekly churn", group: "Yesterday", projectId: "metrics" },
          { id: "deck", title: "Board deck outline", group: "Yesterday", projectId: "board" },
          { id: "tiers", title: "Compare three pricing tiers", group: "Previous 7 days", projectId: "pricing" },
          { id: "onboarding", title: "Tighten onboarding copy", group: "Previous 7 days", projectId: "launch" },
          { id: "offsite", title: "Plan a two-day team offsite", group: "Previous 7 days" },
          { id: "naming", title: "Name ideas for the team plan", group: "Previous 7 days", projectId: "pricing" },
        ]}
        defaultChatId="interviews"
        greeting="Good afternoon"
        productName="Juniper"
        projects={[
          {
            id: "pricing",
            name: "Pricing research",
            description: "Interviews, competitor tiers and the new team plan proposal.",
            icon: TagsIcon,
            tone: 2,
            files: 14,
            updated: "2h ago",
            suggestions: [
              { icon: LightbulbIcon, title: "Top pricing objections", hint: "Across this week's five interviews" },
              { icon: TagsIcon, title: "Compare our tiers", hint: "Against the three closest rivals" },
            ],
          },
          {
            id: "launch",
            name: "Tidepool 2.0 launch",
            description: "Announcement copy, onboarding and the launch week checklist.",
            icon: MegaphoneIcon,
            tone: 1,
            files: 9,
            updated: "Today",
          },
          {
            id: "board",
            name: "Q4 board update",
            description: "Deck outline, metrics and the narrative for the October meeting.",
            icon: PresentationIcon,
            tone: 3,
            files: 6,
            updated: "Yesterday",
            suggestions: [
              { icon: NotebookPenIcon, title: "Outline the board deck", hint: "Twelve slides, numbers first" },
              { icon: MegaphoneIcon, title: "Write the opening line", hint: "The quarter in one sentence" },
            ],
          },
          {
            id: "metrics",
            name: "Growth metrics",
            description: "Saved queries and definitions for churn, activation and retention.",
            icon: DatabaseIcon,
            tone: 5,
            files: 21,
            updated: "Mon",
          },
        ]}
        reply={(prompt) =>
          replies.find((r) => r.match.test(prompt))?.text ??
          `Good question. Here's a first take on "${prompt}".\n\n- Start with the outcome you want\n- List what you already know\n- Fill the gaps with one quick experiment\n\nShare a bit more context and I'll go deeper.`
        }
        suggestions={[
          { icon: MailIcon, title: "Draft a launch email", hint: "For Tidepool 2.0, friendly and short" },
          { icon: BarChart3Icon, title: "Write SQL for weekly churn", hint: "From the accounts table" },
          { icon: NotebookPenIcon, title: "Outline the board deck", hint: "Twelve slides, numbers first" },
          { icon: LightbulbIcon, title: "Summarize interviews", hint: "Top objections and asks" },
        ]}
        user={{ name: "Ines Calder", initials: "IC", plan: "Team plan" }}
      />
    </div>
  );
}

