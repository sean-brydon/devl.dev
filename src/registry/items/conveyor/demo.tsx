import { Conveyor } from "@/registry/items/conveyor/conveyor";

const jobNames = [
  "Summarize ticket #2291",
  "Tag product photos",
  "Transcribe standup.m4a",
  "Extract invoice · Lumen Co",
  "Embed handbook ch. 4",
  "Translate release notes",
  "Draft reply to Orbit Labs",
];

export default function ConveyorDemo() {
  return <Conveyor jobNames={jobNames} title="Agent jobs" />;
}
