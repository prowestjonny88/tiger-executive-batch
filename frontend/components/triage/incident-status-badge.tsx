import { Badge } from "../ui/badge";

interface IncidentStatusBadgeProps {
  recipientType?: string | null;
}

export function IncidentStatusBadge({ recipientType }: IncidentStatusBadgeProps) {
  let variant: "default" | "secondary" | "success" | "warning" = "secondary";
  let label = "Needs Review";

  if (recipientType === "customer") {
    variant = "success";
    label = "Customer Action";
  } else if (recipientType === "after_sales_team") {
    variant = "warning";
    label = "After-sales";
  } else if (recipientType === "none") {
    label = "Identification Only";
  }

  return (
    <Badge variant={variant} className="font-semibold uppercase tracking-widest text-[10px] px-2 py-0.5">
      {label}
    </Badge>
  );
}
