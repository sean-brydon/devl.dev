import { KanbanBoard } from "@/registry/items/kanban-board/kanban-board";

export default function KanbanBoardDemo() {
  return (
    <div className="p-4 sm:p-8">
      <KanbanBoard
        columns={[
          { id: "backlog", title: "Backlog", tone: "gray" },
          { id: "doing", title: "In progress", tone: "blue" },
          { id: "review", title: "Review", tone: "amber" },
          { id: "done", title: "Done", tone: "green" },
        ]}
        labels={[
          { id: "bug", name: "Bug", tone: "red" },
          { id: "feature", name: "Feature", tone: "blue" },
          { id: "design", name: "Design", tone: "amber" },
          { id: "docs", name: "Docs", tone: "gray" },
        ]}
        tasks={[
          {
            id: "orb-142",
            title: "Empty state for the search results page",
            column: "backlog",
            labels: ["design"],
            priority: "low",
            assignee: "Ines Duarte",
            due: "Nov 4",
            comments: 2,
          },
          {
            id: "orb-147",
            title: "Write migration guide for v3 webhooks",
            column: "backlog",
            labels: ["docs"],
            priority: "medium",
            assignee: "Oren Malik",
            checklist: [
              { id: "a", text: "Outline breaking changes", done: true },
              { id: "b", text: "Code samples", done: false },
              { id: "c", text: "Review with support", done: false },
            ],
          },
          {
            id: "orb-151",
            title: "Bulk archive from the inbox",
            column: "backlog",
            labels: ["feature"],
            priority: "medium",
            due: "Nov 12",
          },
          {
            id: "orb-133",
            title: "Timezone drift on recurring reminders",
            column: "doing",
            labels: ["bug"],
            priority: "urgent",
            assignee: "Kai Nakamura",
            due: "Oct 27",
            comments: 7,
            description: "Reminders created before the DST switch fire an hour late for users in Europe.",
            checklist: [
              { id: "a", text: "Reproduce on staging", done: true },
              { id: "b", text: "Store rules in local time", done: true },
              { id: "c", text: "Backfill existing reminders", done: false },
            ],
          },
          {
            id: "orb-138",
            title: "Command palette: recent items",
            column: "doing",
            labels: ["feature", "design"],
            priority: "high",
            assignee: "Ines Duarte",
            comments: 3,
          },
          {
            id: "orb-129",
            title: "New onboarding checklist copy",
            column: "review",
            labels: ["docs", "design"],
            priority: "medium",
            assignee: "Lucía Ferraro",
            due: "Oct 29",
            checklist: [
              { id: "a", text: "Draft", done: true },
              { id: "b", text: "Tone pass", done: true },
            ],
          },
          {
            id: "orb-131",
            title: "Avatar upload crops faces off-centre",
            column: "review",
            labels: ["bug"],
            priority: "high",
            assignee: "Kai Nakamura",
            comments: 1,
          },
          {
            id: "orb-118",
            title: "Keyboard shortcut cheat sheet",
            column: "done",
            labels: ["feature"],
            priority: "low",
            assignee: "Oren Malik",
          },
          {
            id: "orb-121",
            title: "Fix flaky export test on CI",
            column: "done",
            labels: ["bug"],
            priority: "medium",
            assignee: "Lucía Ferraro",
            comments: 4,
          },
        ]}
      />
    </div>
  );
}
