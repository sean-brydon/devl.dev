import { ChatBranches } from "@/registry/items/chat-branches/chat-branches";

export default function ChatBranchesDemo() {
  return (
    <ChatBranches
      defaultLeafId="a4"
      messages={[
        { id: "u1", parentId: null, role: "user", text: "Write a two-line release note for v2.4: offline mode and faster sync." },
        {
          id: "a1",
          parentId: "u1",
          role: "assistant",
          text: "Tideline 2.4 works offline: edits save on your device and sync when you reconnect. Large boards also sync up to 3× faster.",
        },
        { id: "u2", parentId: "a1", role: "user", text: "Make it sound friendlier." },
        {
          id: "a2",
          parentId: "u2",
          role: "assistant",
          text: "Lost your Wi-Fi? Keep going. Tideline 2.4 saves everything and syncs the moment you're back, and big boards now sync up to 3× faster.",
        },
        { id: "u4", parentId: "a2", role: "user", text: "Shorter, for a push notification." },
        { id: "a4", parentId: "u4", role: "assistant", text: "Tideline 2.4: work offline, sync 3× faster." },
        { id: "u3", parentId: "a1", role: "user", text: "Turn it into changelog bullets" },
        {
          id: "a3",
          parentId: "u3",
          role: "assistant",
          text: "• Offline mode: edits save locally and sync on reconnect\n• Sync is up to 3× faster on large boards\n• Fixed: comments sometimes arriving twice",
        },
        { id: "u5", parentId: "a2", role: "user", text: "Mention the new dark mode too" },
        {
          id: "a5",
          parentId: "u5",
          role: "assistant",
          text: "Lost your Wi-Fi? Keep going. Tideline 2.4 syncs when you're back, boards sync 3× faster, and yes, there's finally a dark mode.",
        },
      ]}
    />
  );
}
