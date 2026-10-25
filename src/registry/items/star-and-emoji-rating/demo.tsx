"use client";

import { useState } from "react";
import { EmojiRating, StarRating } from "@/registry/items/star-and-emoji-rating/star-and-emoji-rating";

export default function StarAndEmojiRatingDemo() {
  const [stars, setStars] = useState(4.5);

  return (
    <div className="grid w-80 max-w-full rounded-2xl border bg-card shadow-xs/5">
      <div className="grid gap-3 p-5">
        <div className="grid gap-0.5">
          <p className="font-medium text-sm">How was your stay at Casa Lumen?</p>
          <p className="text-muted-foreground text-xs">Lisbon · 3 nights · 18–21 Oct</p>
        </div>
        <StarRating aria-label="Rate your stay" onValueChange={setStars} value={stars} />
      </div>
      <div className="grid gap-3 border-t p-5">
        <p className="text-center font-medium text-sm">And the check-in?</p>
        <EmojiRating aria-label="Rate the check-in" defaultValue={3} />
      </div>
    </div>
  );
}
