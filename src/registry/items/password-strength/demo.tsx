"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { analysePassword, PasswordStrength } from "@/registry/items/password-strength/password-strength";

export default function PasswordStrengthDemo() {
  const [password, setPassword] = useState("summer2024");
  const strong = analysePassword(password).score >= 3;

  return (
    <form className="grid w-88 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-0.5">
        <p className="font-medium text-sm">Set a password</p>
        <p className="text-muted-foreground text-xs">For mara@northwind.dev</p>
      </div>
      <PasswordStrength onValueChange={setPassword} value={password} />
      <Button disabled={!strong} type="submit">
        Create account
      </Button>
    </form>
  );
}
