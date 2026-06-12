import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ActionPanelCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ActionPanelCard({ title, icon, children, className }: ActionPanelCardProps) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}
