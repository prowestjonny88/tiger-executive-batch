import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface EvidenceStripProps {
  children: ReactNode;
  className?: string;
}

export function EvidenceStrip({ children, className }: EvidenceStripProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
