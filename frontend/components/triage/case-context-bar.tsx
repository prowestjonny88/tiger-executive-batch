import { Zap } from "lucide-react";
import { formatInputComponent, type InputComponent } from "../../lib/api";
import { cn } from "../../lib/utils";

export function CaseContextBar({
  incidentId,
  component,
  status,
  className,
}: {
  incidentId?: number | null;
  component?: InputComponent | string | null;
  status?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm", className)}>
      <Zap className="size-4 text-green-700" />
      <span>{incidentId ? `INC-${incidentId}` : "New report"}</span>
      <span className="text-slate-300">/</span>
      <span>{formatInputComponent(component)}</span>
      {status ? (
        <>
          <span className="text-slate-300">/</span>
          <span>{status}</span>
        </>
      ) : null}
    </div>
  );
}
