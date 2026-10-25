import { SlashMenu } from "@/registry/items/slash-menu/slash-menu";

export default function SlashMenuDemo() {
  return (
    <SlashMenu
      defaultBlocks={[
        { id: "1", type: "text", text: "Three days, eleven people, one very serious pastry budget." },
        { id: "2", type: "heading", text: "Before we fly" },
        { id: "3", type: "todo", text: "Book the flat near Príncipe Real", checked: true },
        { id: "4", type: "todo", text: "Collect dietary needs by Friday" },
        { id: "5", type: "text", text: "" },
      ]}
      title="Offsite, Lisbon"
    />
  );
}
