"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Info } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ApiTriageResponse, formatFaultTypeV2, formatObservationResult } from "../../lib/api";
import { readSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { ConfidencePill } from "../../components/triage/confidence-pill";

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

  return (
    <PageShell maxWidth="3xl">
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
            <p className="text-lg md:text-xl text-green-950 font-semibold leading-relaxed">
              {output.action_message}
            </p>
          </div>

          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <ConfidencePill score={output.confidence_score} />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Safety Note
            </h2>
            <p className="text-slate-700 font-medium leading-relaxed">
              Do not open electrical panels beyond the requested photo evidence. Escalate if there is repeated tripping,
              visible damage, smell, heat, or uncertainty.
            </p>
          </div>

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
