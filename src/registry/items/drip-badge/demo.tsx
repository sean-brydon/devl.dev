"use client";

import { BellIcon, CheckCheckIcon, InboxIcon, MessageCircleIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DripBadge } from "@/registry/items/drip-badge/drip-badge";

export default function DripBadgeDemo() {
  const [mentions, setMentions] = useState(8);
  const [inbox, setInbox] = useState(3);

  useEffect(() => {
    const ids = [window.setTimeout(() => setMentions((n) => n + 1), 900), window.setTimeout(() => setMentions((n) => n + 1), 2100)];
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div className="grid w-80 max-w-full gap-5 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Northwind</p>
        <div className="flex items-center gap-3">
          <DripBadge count={inbox} tone="info">
            <Button aria-label={`Inbox, ${inbox} unread`} onClick={() => setInbox(0)} size="icon" variant="ghost">
              <InboxIcon />
            </Button>
          </DripBadge>
          <DripBadge count={0}>
            <Button aria-label="Messages" size="icon" variant="ghost">
              <MessageCircleIcon />
            </Button>
          </DripBadge>
          <DripBadge count={mentions}>
            <Button aria-label={`Notifications, ${mentions} unread`} size="icon" variant="ghost">
              <BellIcon />
            </Button>
          </DripBadge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setMentions((n) => n + 1)} size="sm" variant="outline">
          <PlusIcon />
          New ping
        </Button>
        <Button disabled={mentions === 0} onClick={() => setMentions((n) => Math.max(0, n - 1))} size="sm" variant="outline">
          <CheckCheckIcon />
          Read one
        </Button>
      </div>
    </div>
  );
}
