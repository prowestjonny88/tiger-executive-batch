"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ApiTriageResponse, formatFaultTypeV2, formatObservationResult } from "../../lib/api";
import { readSession } from "../../lib/triage-session";

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
        <p className="text-slate-500 text-sm">Loading after-sales routing...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">No after-sales record available.</p>
      </div>
    );
  }

  const output = triage.competition_output;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-xl border-slate-200">
        <div className="bg-amber-50 border-b border-amber-200 p-6 px-8 flex justify-between items-center w-full">
          <Badge variant="warning" className="font-bold text-[10px] uppercase tracking-widest px-3 py-1">
            After-sales Routing
          </Badge>
          <div className="font-mono text-slate-700 text-sm font-semibold tracking-wider">
            INC-{triage.incident_id}
          </div>
        </div>

        <CardHeader className="p-10 md:p-12 text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Routed to {output.assigned_team_id || "After-sales Team"}
          </CardTitle>
          <p className="text-slate-600 mt-3">
            {formatObservationResult(output.observation_result)} requires {formatFaultTypeV2(output.fault_type_v2).toLowerCase()} handling.
          </p>
        </CardHeader>

        <CardContent className="px-10 md:px-12 pb-12">
          <Alert className="border-l-4 border-amber-500 rounded-xl mb-6">
            <AlertTitle className="text-xs font-bold uppercase tracking-widest mb-2">Team Message</AlertTitle>
            <AlertDescription className="font-bold text-slate-800">
              {output.action_message}
            </AlertDescription>
          </Alert>

          {output.required_proof_next ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Required Proof</h4>
              <p className="text-slate-800 font-medium">{output.required_proof_next}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Rule Key</h4>
              <p className="text-slate-800 font-medium">{triage.debug.rule_key || "unknown"}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Confidence</h4>
              <p className="text-slate-800 font-medium">{Math.round(output.confidence_score * 100)}%</p>
            </div>
          </div>

          <Button asChild size="lg" className="w-full h-14 rounded-xl font-bold">
            <Link href="/confirmation">Confirm Routing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
