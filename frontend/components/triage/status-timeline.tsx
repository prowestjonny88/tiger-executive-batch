import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

export type TimelineStep = {
  label: string;
  description?: string;
  status: "done" | "current" | "pending" | "warning";
};

const iconMap = {
  done: CheckCircle2,
  current: Clock,
  pending: Circle,
  warning: AlertTriangle,
};

const colorMap = {
  done: "text-green-700 bg-green-50 border-green-200",
  current: "text-blue-700 bg-blue-50 border-blue-200",
  pending: "text-slate-400 bg-slate-50 border-slate-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
};

export function StatusTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step) => {
        const Icon = iconMap[step.status];
        return (
          <div key={step.label} className="flex gap-3">
            <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border", colorMap[step.status])}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="font-bold text-slate-900">{step.label}</p>
              {step.description ? <p className="mt-0.5 text-sm font-medium leading-6 text-slate-500">{step.description}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
