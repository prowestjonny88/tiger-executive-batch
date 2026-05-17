import { ArrowDown } from "lucide-react";
import { formatObservationResult, formatFaultTypeV2, formatRecipientType } from "../../lib/api";

interface DecisionChainProps {
  observationResult: string;
  faultType: string;
  recipientType: string;
  assignedTeamId?: string | null;
  actionMessage: string;
}

export function DecisionChain({
  observationResult,
  faultType,
  recipientType,
  assignedTeamId,
  actionMessage,
}: DecisionChainProps) {
  const steps = [
    {
      label: "Observation",
      value: formatObservationResult(observationResult),
    },
    {
      label: "Fault Type",
      value: formatFaultTypeV2(faultType),
    },
    {
      label: "Recipient",
      value:
        recipientType === "after_sales_team"
          ? `After-sales Team ${assignedTeamId || "AS_TEAM_01"}`
          : formatRecipientType(recipientType),
    },
    {
      label: "Action",
      value: actionMessage,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-col">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block mb-1">
              {step.label}
            </span>
            <span className="font-bold text-slate-900 text-lg">{step.value}</span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex justify-center py-2">
              <ArrowDown className="w-5 h-5 text-slate-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
