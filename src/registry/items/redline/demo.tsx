import { Redline } from "@/registry/items/redline/redline";

export default function RedlineDemo() {
  return (
    <Redline
      segments={[
        "Our new sync engine ",
        { del: "is able to", ins: "can", reason: "Shorter" },
        " merge edits from ",
        { del: "a large number of", ins: "hundreds of", reason: "More concrete" },
        " people at once, ",
        { del: "and it basically never", ins: "without ever", reason: "Removes filler" },
        " dropping a keystroke. Offline changes ",
        { ins: "quietly", reason: "Adds tone" },
        " catch up the moment you reconnect",
        { del: ", which is really great", reason: "Cuts a weak ending" },
        ".",
      ]}
    />
  );
}
