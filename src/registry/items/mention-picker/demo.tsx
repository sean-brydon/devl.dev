import { MentionPicker, type MentionPerson } from "@/registry/items/mention-picker/mention-picker";

const ana: MentionPerson = { id: "ana", name: "Ana Ruiz", initials: "AR", role: "Design", status: "online", avatarClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" };
const sam: MentionPerson = { id: "sam", name: "Sam Okafor", initials: "SO", role: "Engineering", status: "away", avatarClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" };
const leo: MentionPerson = { id: "leo", name: "Leo Brandt", initials: "LB", role: "Product", status: "online", avatarClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
const ivy: MentionPerson = { id: "ivy", name: "Ivy Chen", initials: "IC", role: "Support", status: "offline", avatarClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" };
const kai: MentionPerson = { id: "kai", name: "Kai Moreno", initials: "KM", role: "Marketing", status: "online", avatarClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };

export default function MentionPickerDemo() {
  return (
    <MentionPicker
      channel="launch"
      channels={[
        { id: "c1", name: "launch", members: 6 },
        { id: "c2", name: "design-crit", members: 14 },
        { id: "c3", name: "support-escalations", members: 9 },
      ]}
      currentUser={{ id: "me", name: "Mara Lind", initials: "ML", avatarClassName: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" }}
      files={[
        { id: "f1", name: "Q4 launch plan", location: "Marketing", type: "doc" },
        { id: "f2", name: "Pricing page v3", location: "Design", type: "image" },
        { id: "f3", name: "Kickoff deck", location: "Leadership", type: "slides" },
      ]}
      messages={[
        {
          id: "m1",
          author: ana,
          time: "10:12",
          segments: [
            { type: "text", text: "Hero copy is final in " },
            { type: "mention", kind: "file", id: "f1", label: "Q4 launch plan" },
            { type: "text", text: ". " },
            { type: "mention", kind: "person", id: "sam", label: "Sam Okafor" },
            { type: "text", text: " can you sanity-check the prices before Thursday?" },
          ],
        },
        {
          id: "m2",
          author: sam,
          time: "10:20",
          segments: [{ type: "text", text: "On it. Numbers match the sheet except annual Team, flagging that one." }],
        },
      ]}
      people={[ana, sam, leo, ivy, kai]}
    />
  );
}
