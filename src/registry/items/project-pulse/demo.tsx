import { ProjectPulse } from "@/registry/items/project-pulse/project-pulse";

export default function ProjectPulseDemo() {
  return (
    <ProjectPulse
      defaultOpen
      defaultStatus="at-risk"
      due="Nov 14"
      members={[
        { id: "mara", name: "Mara Okafor" },
        { id: "jun", name: "Jun Takeda" },
        { id: "ines", name: "Ines Varga" },
        { id: "theo", name: "Theo Lindqvist" },
      ]}
      name="Billing portal relaunch"
      tasks={[
        { id: "t1", title: "Audit current invoice flows", assignee: "mara", done: true },
        { id: "t2", title: "New plan picker designs", assignee: "ines", done: true },
        { id: "t3", title: "Proration API", assignee: "jun", done: true },
        { id: "t4", title: "Tax ID validation", assignee: "jun", done: false },
        { id: "t5", title: "Invoice PDF template", assignee: "ines", done: true },
        { id: "t6", title: "Migrate legacy customers", assignee: "theo", done: false },
        { id: "t7", title: "Dunning emails copy", assignee: "mara", done: false },
        { id: "t8", title: "Launch checklist", assignee: "theo", done: false },
      ]}
    />
  );
}
