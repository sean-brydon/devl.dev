import { LivePoll } from "@/registry/items/live-poll/live-poll";

export default function LivePollDemo() {
  return (
    <LivePoll
      defaultPoll={{
        question: "Where should we hold the Q1 offsite?",
        author: "You",
        options: [
          { id: "lisbon", label: "Lisbon", votes: 7 },
          { id: "valencia", label: "Valencia", votes: 5 },
          { id: "porto", label: "Porto", votes: 4 },
          { id: "snow", label: "Somewhere with snow", votes: 2 },
        ],
      }}
      simulateCrowd
    />
  );
}
