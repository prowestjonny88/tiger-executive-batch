import { formatObservationResult, formatFaultTypeV2, formatRecipientType } from "../../lib/api";

interface ResultSummaryProps {
  observationResult: string;
  faultType: string;
  recipientType: string;
  assignedTeamId?: string | null;
}

export function ResultSummary({ observationResult, faultType, recipientType, assignedTeamId }: ResultSummaryProps) {
  const routeLabel =
    recipientType === "after_sales_team"
      ? `After-sales Team ${assignedTeamId || "AS_TEAM_01"}`
      : formatRecipientType(recipientType);

  return (
    <div className="bg-white border-b border-slate-200 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 mb-4">
        Triage Result
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-sm">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Observation</span>
          <span className="font-semibold text-slate-800">{formatObservationResult(observationResult)}</span>
        </div>
        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Fault Type</span>
          <span className="font-semibold text-slate-800">{formatFaultTypeV2(faultType)}</span>
        </div>
        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Route</span>
          <span className="font-semibold text-slate-800">{routeLabel}</span>
        </div>
      </div>
    </div>
  );
}
