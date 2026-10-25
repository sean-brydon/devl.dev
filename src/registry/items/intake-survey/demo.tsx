import { IntakeSurvey } from "@/registry/items/intake-survey/intake-survey";

export default function IntakeSurveyDemo() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <IntakeSurvey
        name="Priya Raman"
        questions={[
          {
            id: "goal",
            kind: "single",
            title: "What brings you to Tidewell?",
            options: ["I run a restaurant or café", "I manage several venues", "I plan private events", "Just looking around"],
          },
          {
            id: "covers",
            kind: "single",
            title: "How many covers on a busy night?",
            hint: "A rough guess is fine. It sets your default floor plan.",
            options: ["Under 50", "50 to 150", "150 to 400", "More than 400"],
          },
          {
            id: "tools",
            kind: "multi",
            title: "What do you take bookings with today?",
            hint: "Pick up to three.",
            max: 3,
            options: ["A paper book", "A spreadsheet", "Another booking app", "Phone and voicemail", "Nothing yet"],
          },
          {
            id: "notes",
            kind: "text",
            title: "Anything we should know before you start?",
            placeholder: "Seasonal hours, a patio that opens in summer, a regular who always wants table 4…",
            optional: true,
          },
        ]}
      />
    </div>
  );
}
