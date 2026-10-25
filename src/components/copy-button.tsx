"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, ...props }: { value: string } & ComponentProps<typeof Button>) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy install command"}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}
