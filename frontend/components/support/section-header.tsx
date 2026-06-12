import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && <p className="technical-label text-green-700">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
