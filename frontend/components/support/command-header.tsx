import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CommandHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function CommandHeader({
  eyebrow,
  title,
  description,
  badges,
  primaryAction,
  secondaryAction,
  className,
}: CommandHeaderProps) {
  return (
    <section className={cn("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6", className)}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="technical-label text-blue-700">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
          {description && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</p>}
          {badges && <div className="mt-4 flex flex-wrap gap-2">{badges}</div>}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    </section>
  );
}
