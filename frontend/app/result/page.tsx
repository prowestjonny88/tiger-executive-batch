"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AnnotatedImage } from "../../components/ui/annotated-image";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  ApiTriageResponse,
  fetchIncidentById,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  formatRecipientType,
  resolveEvidenceUrl,
} from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function recipientBadge(recipient: string) {
  if (recipient === "after_sales_team") return "warning";
  if (recipient === "customer") return "success";
  return "secondary";
}

function routingState(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  if (output.recipient_type === "after_sales_team") {
    return `Routed to After-sales Team: ${output.assigned_team_id || "AS_TEAM_01"}`;
  }
  if (output.recipient_type === "customer") return "Displayed to customer";
  if (output.recipient_type === "none") return "No routing required";
  return "More proof required before routing";
}

export default function ResultAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <p className="text-slate-500 text-sm">Loading assessment...</p>
        </div>
      }
    >
      <ResultAssessment />
    </Suspense>
  );
}

function ResultAssessment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const replayId = searchParams.get("replay");

    if (replayId) {
      fetchIncidentById(parseInt(replayId, 10))
        .then((incidentDetail) => {
          if (incidentDetail.triage_payload) {
            const reconstructedTriage: ApiTriageResponse = {
              ...incidentDetail.triage_payload,
              incident_id: incidentDetail.id,
              incident: {
                ...incidentDetail.triage_payload.incident,
                site_id: incidentDetail.site_id,
                charger_id: incidentDetail.charger_id,
                symptom_text: incidentDetail.symptom_text,
                error_code: incidentDetail.error_code,
                photo_hint: incidentDetail.photo_hint,
                demo_scenario_id: incidentDetail.demo_scenario_id,
                photo_evidence: incidentDetail.photo_evidence || undefined,
                follow_up_answers: incidentDetail.follow_up_answers ?? incidentDetail.triage_payload.incident.follow_up_answers,
              },
            };
            setTriage(reconstructedTriage);
            writeSession({
              incidentId: reconstructedTriage.incident_id,
              siteId: reconstructedTriage.incident.site_id,
              chargerId: reconstructedTriage.incident.charger_id,
              symptomText: reconstructedTriage.incident.symptom_text,
              errorCode: reconstructedTriage.incident.error_code,
              photoHint: reconstructedTriage.incident.photo_hint,
              photoEvidence: reconstructedTriage.incident.photo_evidence,
              followUpAnswers: reconstructedTriage.incident.follow_up_answers,
              demoScenarioId: reconstructedTriage.incident.demo_scenario_id,
              triage: reconstructedTriage,
            });
          }
          setLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load replay incident", error);
          setLoaded(true);
        });
      return;
    }

    const session = readSession();
    if (session.triage) setTriage(session.triage);
    setLoaded(true);
  }, [searchParams]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading assessment...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
        <Card className="w-full shadow-xl border-slate-200 p-10 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">No assessment found</h2>
          <p className="text-slate-600 mb-8">Start a new Theme 2 triage from the upload page.</p>
          <Button onClick={() => router.push("/upload")} size="lg">Start New Triage</Button>
        </Card>
      </div>
    );
  }

  const output = triage.competition_output;
  const extraction = triage.perception.extraction;
  const imageUrl = resolveEvidenceUrl(triage.incident.photo_evidence?.storage_path);
  const nextHref = output.recipient_type === "after_sales_team" ? "/escalation" : "/guidance";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-4xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-8">
        <div className="h-1.5 bg-gradient-to-r from-green-600 via-slate-700 to-amber-500" />
        <CardHeader className="p-10 md:p-12 pb-4 text-center">
          <Badge variant={recipientBadge(output.recipient_type)} className="mx-auto mb-5 uppercase tracking-widest">
            {routingState(triage)}
          </Badge>
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Organizer Required Output
          </CardTitle>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            {output.action_message}
          </p>
        </CardHeader>

        <CardContent className="px-8 md:px-12 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Info label="Observation Result" value={formatObservationResult(output.observation_result)} />
              <Info label="Charger Serial Number" value={output.charger_serial_number || extraction.charger_serial_number || "Not readable"} />
              <Info label="Brand / Model" value={output.charger_brand_model || extraction.charger_brand_model || "Not readable"} />
              <Info label="Fault Type" value={formatFaultTypeV2(output.fault_type_v2)} />
              <Info label="Recipient" value={formatRecipientType(output.recipient_type)} />
              <Info label="Action Message" value={output.action_message} />
              <Info label="Input Component" value={formatInputComponent(output.input_component)} />
            </div>

            {imageUrl ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <AnnotatedImage src={imageUrl} annotations={[]} />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex items-center justify-center text-center">
                <p className="text-slate-500 text-sm">No uploaded image attached to this assessment.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Info label="Routing State" value={routingState(triage)} />
            <Info label="Confidence" value={percent(output.confidence_score)} />
          </div>

          {triage.follow_up_prompts.length ? (
            <div className="mb-8 px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl">
              <strong className="text-slate-800 text-xs uppercase tracking-widest font-extrabold block mb-3">
                System needs more proof
              </strong>
              <ul className="space-y-2 text-slate-700 text-sm">
                {triage.follow_up_prompts.map((prompt) => (
                  <li key={prompt.question_id}>{prompt.prompt}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {output.required_proof_next ? (
            <div className="mb-8 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
              <strong className="text-amber-800 text-xs uppercase tracking-widest font-extrabold block mb-1">
                Required Proof Next
              </strong>
              <p className="text-amber-800 font-medium">{output.required_proof_next}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">Perception</h3>
              <p className="font-semibold text-slate-900">{triage.perception.scene_summary}</p>
              <p className="text-slate-600 text-sm mt-2">
                Mode: {triage.perception.mode} | Evidence: {triage.perception.evidence_type}
              </p>
              {triage.perception.ocr_findings.length ? (
                <p className="text-slate-600 text-sm mt-2">Visible text: {triage.perception.ocr_findings.join(" | ")}</p>
              ) : null}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">Evidence Notes</h3>
              {output.evidence_notes.length ? (
                <ul className="space-y-2 text-slate-700 text-sm">
                  {output.evidence_notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              ) : (
                <p className="text-slate-600 text-sm">No additional evidence notes.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <Button asChild size="lg" className="flex-1 h-14 rounded-xl font-bold">
              <a href={nextHref}>
                {output.recipient_type === "after_sales_team" ? "View After-sales Routing" : "View Customer Guidance"}
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1 h-14 rounded-xl font-bold">
              <a href="/upload">Run Triage Again</a>
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-8 font-mono">
            Incident ID: INC-{triage.incident_id} | Rule: {triage.debug.rule_key || "unknown"} | Version: {triage.debug.rule_version || "unknown"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">{label}</h3>
      <p className="font-bold text-slate-900">{value}</p>
    </div>
  );
}
