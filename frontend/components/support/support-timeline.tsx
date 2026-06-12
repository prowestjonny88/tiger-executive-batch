import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SupportTimelineItem {
  title: string;
  body?: ReactNode;
  timestamp?: string;
}

interface SupportTimelineProps {
  items: SupportTimelineItem[];
  className?: string;
}

export function SupportTimeline({ items, className }: SupportTimelineProps) {
  return (
    <ol className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="relative border-l border-slate-200 pl-4">
          <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border border-blue-200 bg-blue-600" />
          <p className="text-sm font-extrabold text-slate-950">{item.title}</p>
          {item.timestamp && <p className="mt-1 text-xs font-bold text-slate-500">{item.timestamp}</p>}
          {item.body && <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.body}</div>}
        </li>
      ))}
    </ol>
  );
}
