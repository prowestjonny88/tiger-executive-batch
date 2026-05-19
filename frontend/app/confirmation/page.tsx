"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, Plus, ReceiptText } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { formatFaultTypeV2, formatObservationResult, formatRecipientType } from "../../lib/api";
import { clearSession, readSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";

export default function Confirmation() {
  const router = useRouter();
  const [incidentId, setIncidentId] = useState<number | undefined>();
  const [recipient, setRecipient] = useState<string | undefined>();
  const [teamId, setTeamId] = useState<string | null | undefined>();
  const [observation, setObservation] = useState<string | undefined>();
  const [fault, setFault] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    const output = session.triage?.competition_output;
    setIncidentId(session.triage?.incident_id);
    setRecipient(output?.recipient_type);
    setTeamId(output?.assigned_team_id);
    setObservation(output?.observation_result);
    setFault(output?.fault_type_v2);
    setLoaded(true);
  }, []);

  const handleReturnHome = () => {
    clearSession();
    router.push("/");
  };

  const handleStartNew = () => {
    clearSession();
    router.push("/upload");
  };

  const outcomeLabel =
    recipient === "after_sales_team"
      ? `Routed to ${teamId || "After-sales Team"}`
      : recipient === "customer"
        ? "Displayed to Customer"
        : recipient
          ? `${formatRecipientType(recipient)} Logged`
          : "Triage Complete";

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <PageShell maxWidth="3xl">
      <Card className="w-full shadow-sm border-slate-200 rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-12 md:p-16 flex flex-col items-center text-center">
          <div className="mx-auto w-24 h-24 bg-green-50 text-green-700 rounded-full flex items-center justify-center mb-8">
            <CheckCircle className="w-12 h-12" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight leading-tight">
            Report Complete
          </h1>

          <div className="bg-green-50/50 border border-green-200 text-green-800 font-bold text-sm tracking-widest uppercase px-6 py-3 rounded-full shadow-sm mb-6">
            {outcomeLabel}
          </div>

          {incidentId && (
            <div className="bg-slate-50 border border-slate-200 text-slate-700 font-mono text-sm font-bold tracking-[0.1em] px-6 py-3 rounded-full shadow-sm mb-8">
              INCIDENT ID: INC-{incidentId}
            </div>
          )}

          <div className="flex flex-col gap-2 mb-10 w-full max-w-sm">
            {observation && (
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm uppercase tracking-widest font-bold">Observation</span>
                <span className="text-slate-900 font-bold">{formatObservationResult(observation)}</span>
              </div>
            )}
            {fault && (
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm uppercase tracking-widest font-bold">Fault Type</span>
                <span className="text-slate-900 font-bold">{formatFaultTypeV2(fault)}</span>
              </div>
            )}
          </div>

          <p className="text-slate-600 text-lg max-w-md mx-auto mb-12 leading-relaxed">
            {recipient === "after_sales_team"
              ? "The case has been routed to the assigned after-sales team."
              : "The customer-facing instruction has been displayed and the assessment has been logged."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            {incidentId && (
              <Button
                asChild
                variant="outline"
                className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-lg h-14 px-8 rounded-xl w-full sm:w-auto flex items-center gap-2"
                size="lg"
              >
                <Link href={`/result?replay=${incidentId}`}>
                  <ReceiptText className="w-5 h-5" /> View Report Again
                </Link>
              </Button>
            )}
            <Button
              id="confirmation-new-triage-btn"
              onClick={handleStartNew}
              className="bg-green-700 hover:bg-green-800 text-white font-bold text-lg h-14 px-8 rounded-xl w-full sm:w-auto flex items-center gap-2"
              size="lg"
            >
              <Plus className="w-5 h-5" /> New Triage
            </Button>
            <Button
              id="confirmation-home-btn"
              onClick={handleReturnHome}
              variant="outline"
              className="text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-lg h-14 px-8 rounded-xl w-full sm:w-auto flex items-center gap-2"
              size="lg"
            >
              <Home className="w-5 h-5" /> Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
