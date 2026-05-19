"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

export function CopyButton({ text, label = "Copy instruction" }: { text: string; label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-xl border-slate-200 font-bold"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Instruction copied");
      }}
    >
      <Copy className="mr-2 size-4" />
      {label}
    </Button>
  );
}
