"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Info, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ApiTriageResponse, formatFaultTypeV2, formatObservationResult } from "../../lib/api";
import { readSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { ConfidencePill } from "../../components/triage/confidence-pill";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { CopyButton } from "../../components/triage/copy-button";
import { CaseContextBar } from "../../components/triage/case-context-bar";

export default function SafeGuidance() {
  const router = useRouter();
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session.triage) setTriage(session.triage);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 font-medium animate-pulse">Loading guidance...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <PageShell maxWidth="3xl">
        <Card className="w-full shadow-sm border-slate-200 p-10 text-center rounded-2xl bg-white">
          <p className="text-slate-500 font-medium">No guidance available.</p>
        </Card>
      </PageShell>
    );
  }

  const output = triage.competition_output;
  const actionSteps = output.action_message
    .split(/\.\s+/)
    .map((step) => step.trim().replace(/\.$/, ""))
    .filter(Boolean);

  return (
    <PageShell maxWidth="3xl">
      <CaseContextBar incidentId={triage.incident_id} component={output.input_component} status="Customer guidance" className="mx-auto mb-5 w-fit" />
      <Card className="w-full shadow-sm border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div className="bg-slate-50 border-b border-slate-100 p-8 md:p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Customer Guidance
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            {formatObservationResult(output.observation_result)} mapped to {formatFaultTypeV2(output.fault_type_v2)}.
          </p>
        </div>

        <CardContent className="p-8 md:p-12">
          <div className="bg-green-50/50 border border-green-200 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-green-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Recommended Action
            </h2>
            <ol className="space-y-3">
              {(actionSteps.length ? actionSteps : [output.action_message]).map((step, index) => (
                <li key={step} className="flex gap-3 text-lg text-green-950 font-semibold leading-relaxed">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-green-700 text-sm text-white">{index + 1}</span>
                  <span>{step}.</span>
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <CopyButton text={output.action_message} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <ConfidencePill score={output.confidence_score} />
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-green-800">
                <CheckCircle2 className="size-4" /> Do
              </h3>
              <ul className="space-y-2 text-sm font-semibold leading-6 text-green-950">
                <li>Check visible indicator lights and labels.</li>
                <li>Photograph breaker or switch state clearly.</li>
                <li>Escalate if the same breaker trips again.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-red-800">
                <XCircle className="size-4" /> Do not
              </h3>
              <ul className="space-y-2 text-sm font-semibold leading-6 text-red-950">
                <li>Do not open internal charger casing.</li>
                <li>Do not touch exposed wires or wet equipment.</li>
                <li>Do not keep resetting a breaker that trips again.</li>
              </ul>
            </div>
          </div>

          <Alert variant="warning" className="mb-8 rounded-2xl">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Safety note</AlertTitle>
            <AlertDescription>
              Do not open electrical panels beyond the requested photo evidence. Escalate if there is repeated tripping,
              visible damage, smell, heat, or uncertainty.
            </AlertDescription>
          </Alert>

          <Button
            id="guidance-confirm-btn"
            onClick={() => router.push("/confirmation")}
            className="w-full h-14 rounded-xl font-bold bg-green-700 hover:bg-green-800 text-lg shadow-sm"
            size="lg"
          >
            Close Case and Report
          </Button>
          <Button asChild variant="outline" size="lg" className="mt-3 h-14 w-full rounded-xl border-slate-200 font-bold text-slate-700">
            <Link href="/result">Back to result summary</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
