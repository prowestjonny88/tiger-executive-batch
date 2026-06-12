import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CommandCardProps {
  children: ReactNode;
  tone?: "green" | "blue" | "amber" | "red" | "slate";
  className?: string;
}

export function CommandCard({ children, tone = "green", className }: CommandCardProps) {
  const toneClass = {
    green: "border-green-200 bg-green-50",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    slate: "border-slate-200 bg-slate-50",
  }[tone];

  return (
    <section className={cn("rounded-3xl border p-5 shadow-sm md:p-6", toneClass, className)}>
      {children}
    </section>
  );
}
