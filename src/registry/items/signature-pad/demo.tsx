"use client";

import { FileTextIcon } from "lucide-react";
import { SignaturePad } from "@/registry/items/signature-pad/signature-pad";

export default function SignaturePadDemo() {
  return (
    <div className="grid w-96 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileTextIcon className="size-4" />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate font-medium text-sm">Studio lease · Unit 4B</p>
          <p className="text-muted-foreground text-xs">Halcyon Properties · 12 months from 1 Nov</p>
        </div>
      </div>
      <SignaturePad signer="Ava Lindqvist" />
    </div>
  );
}
