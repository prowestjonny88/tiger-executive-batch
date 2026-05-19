"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Headphones, AlertCircle, Info } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { ApiTriageResponse, formatFaultTypeV2, formatObservationResult } from "../../lib/api";
import { readSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { ConfidencePill } from "../../components/triage/confidence-pill";
import { StatusTimeline } from "../../components/triage/status-timeline";
import { CaseContextBar } from "../../components/triage/case-context-bar";

export default function Escalation() {
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    setTriage(session.triage ?? null);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 font-medium animate-pulse">Loading after-sales routing...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <PageShell maxWidth="3xl">
        <Card className="w-full shadow-sm border-slate-200 p-10 text-center rounded-2xl bg-white">
          <p className="text-slate-500 font-medium">No after-sales record available.</p>
        </Card>
      </PageShell>
    );
  }

  const output = triage.competition_output;

  return (
    <PageShell maxWidth="3xl">
      <CaseContextBar incidentId={triage.incident_id} component={output.input_component} status="After-sales routing" className="mx-auto mb-5 w-fit" />
      <Card className="w-full shadow-sm border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="bg-blue-50/60 border-b border-blue-100 p-8 md:p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mb-6">
            <Headphones className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            After-sales Work Order
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            {formatObservationResult(output.observation_result)} requires {formatFaultTypeV2(output.fault_type_v2).toLowerCase()} handling.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <div className="text-sm text-blue-700 font-mono font-bold tracking-wider bg-white px-4 py-2 rounded-lg border border-blue-200">
              INC-{triage.incident_id}
            </div>
            <div className="text-sm text-blue-700 font-mono font-bold tracking-wider bg-white px-4 py-2 rounded-lg border border-blue-200">
              {output.assigned_team_id || "AS_TEAM_01"}
            </div>
          </div>
        </div>

        <CardContent className="p-8 md:p-12">
          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
            <h2 className="technical-label mb-4 text-blue-700">Routing timeline</h2>
            <StatusTimeline
              steps={[
                { label: "Evidence received", description: formatObservationResult(output.observation_result), status: "done" },
                { label: "Issue type identified", description: formatFaultTypeV2(output.fault_type_v2), status: "done" },
                { label: "Rule applied", description: triage.debug.rule_key || "Theme 2 rule mapper", status: "done" },
                { label: "After-sales route ready", description: output.assigned_team_id || "AS_TEAM_01", status: "current" },
              ]}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Team Message
            </h2>
            <p className="text-lg md:text-xl text-amber-950 font-semibold leading-relaxed">
              {output.action_message}
            </p>
          </div>

          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <ConfidencePill score={output.confidence_score} />
          </div>

          {triage.perception.fallback_used && (
            <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-800 text-xs uppercase tracking-widest font-extrabold block mb-0.5">
                  Fallback Mode
                </strong>
                <p className="text-amber-800 text-sm font-medium">
                  Vision model unavailable; using fallback interpretation.
                </p>
              </div>
            </div>
          )}

          {output.required_proof_next && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Required Proof</h4>
              <p className="text-slate-800 font-medium">{output.required_proof_next}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Rule Key</h4>
              <p className="text-slate-800 font-medium font-mono">{triage.debug.rule_key || "unknown"}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Confidence</h4>
              <p className="text-slate-800 font-medium">{Math.round(output.confidence_score * 100)}%</p>
            </div>
          </div>

          <details className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              Advanced Debug
            </summary>
            <pre className="mt-4 whitespace-pre-wrap break-words text-xs text-slate-600 font-mono">
              {JSON.stringify(
                {
                  rule_key: triage.debug.rule_key,
                  override_key: triage.debug.extra?.override_key,
                  fallback_used: triage.debug.fallback_used,
                  perception_error_type: triage.perception.error_type,
                },
                null,
                2
              )}
            </pre>
          </details>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="w-full h-14 rounded-xl font-bold bg-green-700 hover:bg-green-800 text-lg shadow-sm">
                Confirm Routing
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm route to {output.assigned_team_id || "AS_TEAM_01"}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the report as sent to after-sales for technical review.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Link href="/confirmation">Confirm Routing</Link>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild variant="outline" size="lg" className="mt-3 h-14 w-full rounded-xl border-slate-200 font-bold text-slate-700">
            <Link href="/result">Back to result summary</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
