"use client";

import { MessageSquareIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneField, type PhoneValue } from "@/registry/items/phone-field/phone-field";

export default function PhoneFieldDemo() {
  const [phone, setPhone] = useState<PhoneValue | null>(null);

  return (
    <form className="grid w-88 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-0.5">
        <p className="font-medium text-sm">Turn on two-step sign-in</p>
        <p className="text-pretty text-muted-foreground text-xs">We'll send a six-digit code each time you sign in on a new device.</p>
      </div>
      <PhoneField defaultCountry="GB" onValueChange={setPhone} />
      <Button disabled={!phone?.e164} type="submit">
        <MessageSquareIcon />
        Send code
      </Button>
    </form>
  );
}
