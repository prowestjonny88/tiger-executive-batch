import type { TicketStatus } from "../../lib/api";
import { cn } from "../../lib/utils";
import { getStatusMeta, toneClass } from "../../lib/ticket-ui";

interface StatusBadgeProps {
  status?: TicketStatus | string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", toneClass(meta.tone), className)}>
      {meta.label}
    </span>
  );
}
