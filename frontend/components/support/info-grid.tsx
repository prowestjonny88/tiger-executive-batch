import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InfoGridItem {
  label: string;
  value?: ReactNode;
}

interface InfoGridProps {
  items: InfoGridItem[];
  className?: string;
}

export function InfoGrid({ items, className }: InfoGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="technical-label text-slate-500">{item.label}</p>
          <div className="mt-1 text-sm font-extrabold text-slate-950">{item.value || "Not provided"}</div>
        </div>
      ))}
    </div>
  );
}
