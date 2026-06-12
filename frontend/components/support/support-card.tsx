import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SupportCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function SupportCard({ children, className, ...props }: SupportCardProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)} {...props}>
      {children}
    </section>
  );
}
