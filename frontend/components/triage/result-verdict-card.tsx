import {
  AlertTriangle,
  CheckCircle2,
  Headphones,
  HelpCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import {
  formatFaultTypeV2,
  formatObservationResult,
  formatRecipientType,
  type ApiTriageResponse,
} from "../../lib/api";
import { deriveResultState, type ResultTone } from "../../lib/theme2-result-state";
import { ConfidencePill } from "./confidence-pill";

const toneClasses: Record<ResultTone, string> = {
  green: "border-green-200 bg-green-50 text-green-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-200 bg-red-50 text-red-950",
  slate: "border-slate-200 bg-slate-50 text-slate-950",
};

const iconClasses: Record<ResultTone, string> = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-700",
};

function iconForTone(tone: ResultTone): LucideIcon {
  if (tone === "red") return ShieldAlert;
  if (tone === "blue") return Headphones;
  if (tone === "amber") return AlertTriangle;
  if (tone === "green") return CheckCircle2;
  return HelpCircle;
}

export function ResultVerdictCard({ triage }: { triage: ApiTriageResponse }) {
  const output = triage.competition_output;
  const resultState = deriveResultState(triage);
  const Icon = iconForTone(resultState.tone);
  const recipient =
    output.recipient_type === "after_sales_team" && output.assigned_team_id
      ? `${formatRecipientType(output.recipient_type)}: ${output.assigned_team_id}`
      : formatRecipientType(output.recipient_type);

  return (
    <section className={`rounded-2xl border p-5 shadow-sm md:p-6 ${toneClasses[resultState.tone]}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClasses[resultState.tone]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest opacity-70">
              Result
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
              {resultState.title}
            </h2>
            <p className="mt-2 text-sm font-semibold opacity-80">
              {resultState.status}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <ConfidencePill score={output.confidence_score} />
          <span className="rounded-lg border border-white/70 bg-white/70 px-3 py-2 font-mono text-sm font-bold text-slate-700">
            INC-{triage.incident_id}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/70 bg-white/70 p-4">
          <p className="technical-label text-slate-500">What we found</p>
          <p className="mt-1 font-bold text-slate-950">{formatObservationResult(output.observation_result)}</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-4">
          <p className="technical-label text-slate-500">Issue type</p>
          <p className="mt-1 font-bold text-slate-950">{formatFaultTypeV2(output.fault_type_v2)}</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-4">
          <p className="technical-label text-slate-500">Sent to</p>
          <p className="mt-1 font-bold text-slate-950">{recipient}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{resultState.recipientHelper}</p>
        </div>
      </div>
    </section>
  );
}
