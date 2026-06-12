import { ReactNode } from "react";
import { Headphones } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm", className)}>
      <Headphones className="mx-auto mb-4 h-10 w-10 text-slate-400" />
      <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
