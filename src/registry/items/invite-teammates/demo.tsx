"use client";

import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InviteTeammates } from "@/registry/items/invite-teammates/invite-teammates";

export default function InviteTeammatesDemo() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <UserPlusIcon />
        Invite teammates
      </Button>
    );
  }
  return (
    <InviteTeammates
      defaultInvites={[
        { email: "iris.okafor@larkspur.io", role: "member" },
        { email: "dev.mehta@larkspur.io", role: "admin" },
        { email: "tomas@larkspur", role: "member" },
      ]}
      defaultLinkEnabled
      description="Teammates get access to every project in this workspace."
      inviteLink="https://larkspur.app/join/q7Hk-2pZx"
      members={[
        { name: "Noor Halvorsen", email: "noor@larkspur.io", role: "owner" },
        { name: "Felix Arden", email: "felix@larkspur.io", role: "admin" },
      ]}
      onCancel={() => setOpen(false)}
      workspace="Larkspur Studio"
    />
  );
}
