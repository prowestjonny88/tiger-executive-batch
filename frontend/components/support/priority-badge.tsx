import type { TicketPriority } from "../../lib/api";
import { cn } from "../../lib/utils";
import { getPriorityMeta, toneClass } from "../../lib/ticket-ui";

interface PriorityBadgeProps {
  priority?: TicketPriority | string | null;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const meta = getPriorityMeta(priority);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", toneClass(meta.tone), className)}>
      {meta.label}
    </span>
  );
}
