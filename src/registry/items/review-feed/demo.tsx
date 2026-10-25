import { ReviewFeed } from "@/registry/items/review-feed/review-feed";

export default function ReviewFeedDemo() {
  return (
    <ReviewFeed
      comments={[
        {
          id: "1",
          author: "Ines Okafor",
          initials: "IO",
          tone: "info",
          time: "9:14",
          anchor: "Hero headline",
          body: "Can we say what it does in five words? This reads like a mission statement.",
        },
        {
          id: "2",
          author: "Teo Varga",
          initials: "TV",
          tone: "warning",
          time: "9:30",
          anchor: "Pricing · Team plan",
          body: "Seat price is €12 here and €14 on the checkout page.",
        },
        {
          id: "3",
          author: "Priya Sandhu",
          initials: "PS",
          tone: "success",
          time: "Yesterday",
          anchor: "Footer",
          body: "Legal asked for the imprint link to sit next to privacy.",
          resolved: true,
        },
        {
          id: "4",
          author: "Ines Okafor",
          initials: "IO",
          tone: "info",
          time: "10:02",
          anchor: "Customer logos",
          body: "Swap Northwind for Lumen Labs, they signed off on using their mark.",
        },
      ]}
      currentUser={{ name: "Arlo Kim", initials: "AK", tone: "destructive" }}
    />
  );
}
