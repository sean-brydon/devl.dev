"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SocialPill } from "@/registry/items/social-pill/social-pill";

export default function SocialPillDemo() {
  const [likes, setLikes] = useState(1196);
  const [comments, setComments] = useState(48);

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      setLikes((n) => n + 1 + Math.floor(Math.random() * 3));
      if (ticks >= 5) clearInterval(id);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <article className="grid w-full max-w-sm gap-3 rounded-2xl border bg-card p-4">
      <header className="flex items-center gap-2.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-violet-600 text-white text-xs">IV</AvatarFallback>
        </Avatar>
        <div className="grid">
          <span className="font-medium text-sm">Ines Varga</span>
          <span className="text-muted-foreground text-xs">@ines · 2h</span>
        </div>
      </header>
      <p className="text-sm">
        Shipped the new onboarding today. Signup to first project dropped from 6 minutes to 90 seconds.
      </p>
      <SocialPill
        comments={comments}
        likes={likes}
        onComment={() => setComments((n) => n + 1)}
        reposts={87}
      />
    </article>
  );
}
