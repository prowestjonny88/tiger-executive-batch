"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import svgPaths from "../../imports/8Confirmation/svg-sylya79o1n";
import { formatFaultTypeV2, formatObservationResult, formatRecipientType } from "../../lib/api";
import { clearSession, readSession } from "../../lib/triage-session";

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
          : "Theme 2 Triage Complete";

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white border border-slate-200 shadow-xl rounded-3xl w-full flex flex-col items-center overflow-hidden mb-6 p-12 md:p-16 text-center">
        <div className="bg-green-400 w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg mb-10">
          <svg className="w-12 h-12 text-green-950" fill="none" viewBox="0 0 40 40">
            <path d={svgPaths.pf059c0} fill="currentColor" />
          </svg>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight uppercase leading-none whitespace-pre-line">
          {incidentId ? "Report Successfully\nSubmitted" : "Assessment\nComplete"}
        </h1>

        <div className="bg-green-50 border border-green-200 text-green-800 font-bold text-sm tracking-wide px-5 py-2.5 rounded-lg shadow-sm mb-4">
          {outcomeLabel}
        </div>

        {incidentId ? (
          <div className="bg-slate-100 border border-slate-200 text-slate-800 font-mono text-sm font-bold tracking-[0.1em] px-5 py-2.5 rounded-lg shadow-sm mb-4">
            INCIDENT ID: INC-{incidentId}
          </div>
        ) : null}

        {observation ? (
          <p className="text-slate-500 text-sm font-medium mb-3">
            Observation: <span className="text-slate-800 font-bold">{formatObservationResult(observation)}</span>
          </p>
        ) : null}

        {fault ? (
          <p className="text-slate-500 text-sm font-medium mb-8">
            Fault type: <span className="text-slate-800 font-bold">{formatFaultTypeV2(fault)}</span>
          </p>
        ) : null}

        <p className="text-slate-600 text-lg max-w-md mx-auto mb-14 leading-relaxed font-medium">
          {recipient === "after_sales_team"
            ? "The case has been routed to the assigned after-sales team identifier within the prototype."
            : "The customer-facing instruction has been displayed and the Theme 2 assessment has been logged."}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            id="confirmation-new-triage-btn"
            onClick={handleStartNew}
            className="bg-gradient-to-r from-green-700 to-green-500 text-white font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg w-full sm:w-auto text-center"
          >
            New Triage
          </button>
          <button
            id="confirmation-home-btn"
            onClick={handleReturnHome}
            className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-sm w-full sm:w-auto text-center"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
