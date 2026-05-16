"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ApiTriageResponse, formatFaultTypeV2, formatObservationResult, formatRecipientType } from "../../lib/api";
import { readSession } from "../../lib/triage-session";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function confidenceLabel(value: number) {
  if (value >= 0.75) return `High confidence (${percent(value)})`;
  if (value >= 0.55) return `Medium confidence (${percent(value)})`;
  return `Low confidence - system needs more proof (${percent(value)})`;
}

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
        <p className="text-slate-500 text-sm">Loading guidance...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">No Theme 2 guidance available.</p>
      </div>
    );
  }

  const output = triage.competition_output;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      <Card className="w-full shadow-xl border-slate-200">
        <CardHeader className="p-10 md:p-12 text-center">
          <Badge variant={output.recipient_type === "customer" ? "success" : "secondary"} className="mx-auto mb-5 uppercase tracking-widest">
            {output.recipient_type === "customer" ? "Result displayed to customer" : formatRecipientType(output.recipient_type)}
          </Badge>
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Customer Guidance
          </CardTitle>
          <p className="text-slate-600 mt-3">
            {formatObservationResult(output.observation_result)} mapped to {formatFaultTypeV2(output.fault_type_v2)}.
          </p>
        </CardHeader>
        <CardContent className="px-10 md:px-12 pb-12">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-green-800 mb-2">Action Message</h2>
            <p className="text-green-900 font-semibold leading-relaxed">{output.action_message}</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2">Confidence</h2>
            <p className="text-slate-800 font-semibold">{confidenceLabel(output.confidence_score)}</p>
          </div>

          {triage.perception.fallback_used ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-800 mb-2">Fallback Interpretation</h2>
              <p className="text-amber-900 font-semibold">Vision model unavailable; using fallback interpretation.</p>
            </div>
          ) : null}

          {output.required_proof_next ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-800 mb-2">Required Proof</h2>
              <p className="text-amber-900 font-semibold leading-relaxed">{output.required_proof_next}</p>
            </div>
          ) : null}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2">Safety Note</h2>
            <p className="text-slate-700 font-medium">
              Do not open electrical panels beyond the requested photo evidence. Escalate if there is repeated tripping,
              visible damage, smell, heat, or uncertainty.
            </p>
          </div>

          <Button
            id="guidance-confirm-btn"
            onClick={() => router.push("/confirmation")}
            className="w-full h-14 rounded-xl font-bold"
            size="lg"
          >
            Close Case and Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
