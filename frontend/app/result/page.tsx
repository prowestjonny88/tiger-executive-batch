"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Clipboard, RotateCcw } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  ApiTriageResponse,
  CompetitionOutput,
  fetchIncidentById,
  fetchTriage,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  Theme2VisualExtraction,
  resolveEvidenceUrl,
  uploadIncidentPhoto,
} from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { DecisionChain } from "../../components/triage/decision-chain";
import { EvidencePanel } from "../../components/triage/evidence-panel";
import { ProofRequiredCard } from "../../components/triage/proof-required-card";
import { ResultVerdictCard } from "../../components/triage/result-verdict-card";
import { UploadDropzone } from "../../components/triage/upload-dropzone";
import {
  buildComponentEvidenceFields,
  buildCoreOrganizerOutputFields,
  type OrganizerOutputField,
} from "../../lib/theme2-result-fields";
import { deriveResultState } from "../../lib/theme2-result-state";
import { RouteBadge } from "../../components/triage/route-badge";

export default function ResultAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <p className="text-slate-500 font-medium animate-pulse">Loading assessment...</p>
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
  const [appScreenshotFile, setAppScreenshotFile] = useState<File | null>(null);
  const [appScreenshotStatus, setAppScreenshotStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [appScreenshotError, setAppScreenshotError] = useState("");

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
                app_screenshot_evidence:
                  incidentDetail.app_screenshot_evidence || incidentDetail.triage_payload.incident.app_screenshot_evidence,
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
                appScreenshotEvidence: reconstructedTriage.incident.app_screenshot_evidence,
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
        <p className="text-slate-500 font-medium animate-pulse">Loading assessment...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <PageShell maxWidth="3xl">
        <Card className="w-full shadow-sm border-slate-200 p-10 text-center rounded-2xl bg-white">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">No assessment found</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">We couldn't find a recent triage session. Please start a new upload or demo scenario.</p>
          <Button onClick={() => router.push("/upload")} size="lg" className="bg-green-700 hover:bg-green-800 h-14 px-8 rounded-xl text-lg font-bold">
            Start New Triage
          </Button>
        </Card>
      </PageShell>
    );
  }

  const output = triage.competition_output;
  const imageUrl = resolveEvidenceUrl(triage.incident.photo_evidence);
  const resultState = deriveResultState(triage);
  const coreFields = buildCoreOrganizerOutputFields(output, triage.perception.extraction);
  const componentEvidenceFields = buildComponentEvidenceFields(output, triage.perception.extraction);
  const appScreenshotPrompt = triage.follow_up_prompts.find((prompt) => prompt.question_id === "charger_app_screenshot");
  const hasAppScreenshot = Boolean(triage.incident.app_screenshot_evidence);

  const showFallbackWarning = triage.perception.fallback_used;

  const handleAppScreenshotSubmit = async () => {
    if (!appScreenshotFile || appScreenshotStatus === "uploading") return;
    setAppScreenshotStatus("uploading");
    setAppScreenshotError("");

    try {
      const uploaded = await uploadIncidentPhoto(appScreenshotFile);
      const followUpAnswers = {
        ...(triage.incident.follow_up_answers ?? {}),
        charger_app_screenshot: `[Uploaded app screenshot: ${uploaded.filename}]`,
      };
      const nextTriage = await fetchTriage({
        incident_id: triage.incident_id,
        site_id: triage.incident.site_id,
        charger_id: triage.incident.charger_id,
        photo_evidence: triage.incident.photo_evidence,
        app_screenshot_evidence: uploaded,
        photo_hint: triage.incident.photo_hint ?? "",
        symptom_text: triage.incident.symptom_text ?? "",
        error_code: triage.incident.error_code ?? "",
        follow_up_answers: followUpAnswers,
        demo_scenario_id: triage.incident.demo_scenario_id,
      });

      setTriage(nextTriage);
      setAppScreenshotFile(null);
      setAppScreenshotStatus("idle");
      writeSession({
        incidentId: nextTriage.incident_id,
        appScreenshotEvidence: uploaded,
        followUpAnswers,
        triage: nextTriage,
      });
    } catch (error) {
      setAppScreenshotStatus("error");
      setAppScreenshotError(error instanceof Error ? error.message : "App screenshot upload failed. Please try again.");
    }
  };

  return (
    <PageShell maxWidth="7xl">
      <Card className="mb-8 w-full overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="technical-label text-green-700">Engineering workspace</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
              Triage Complete
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Evidence-based Theme 2 result with routing, component telemetry, and audit trace.
            </p>
          </div>
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700">
            <a href="/upload">
              <RotateCcw className="mr-2 h-4 w-4" />
              Run Triage Again
            </a>
          </Button>
          </div>
        </div>

        <CardContent className="p-4 md:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <main className="space-y-6">
              <ResultVerdictCard triage={triage} />

              <DeviceTelemetryGrid
                output={output}
                extraction={triage.perception.extraction}
                coreFields={coreFields}
                componentFields={componentEvidenceFields}
              />

              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="technical-label text-slate-500">Operational protocol</p>
                    <h2 className="mt-1 text-xl font-extrabold text-slate-950">Required action and proof posture</h2>
                  </div>
                  <RouteBadge recipientType={output.recipient_type} />
                </div>

                <Alert className="mb-4 rounded-r-xl rounded-l-sm border-green-200 border-l-4 border-l-green-600 bg-green-50/30">
                  <AlertTitle className="text-xs font-extrabold uppercase tracking-widest text-green-800">
                    Mandatory next action
                  </AlertTitle>
                  <AlertDescription className="font-semibold leading-6 text-green-950">
                    {output.action_message}
                  </AlertDescription>
                </Alert>

                {output.required_proof_next && (
                  <Alert variant="warning" className="mb-4 rounded-r-xl rounded-l-sm border-l-4 border-l-amber-500 bg-amber-50/60">
                    <AlertTitle className="text-xs font-extrabold uppercase tracking-widest text-amber-800">
                      Proof required
                    </AlertTitle>
                    <AlertDescription className="font-semibold leading-6 text-amber-950">
                      {output.required_proof_next}
                    </AlertDescription>
                  </Alert>
                )}

              {showFallbackWarning && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="mb-0.5 block text-xs font-extrabold uppercase tracking-widest text-amber-800">
                      Fallback Mode
                    </strong>
                    <p className="text-sm font-medium text-amber-800">
                      Vision model unavailable; using fallback interpretation.
                    </p>
                  </div>
                </div>
              )}

              <ProofRequiredCard
                proofNext={output.required_proof_next}
                prompts={triage.follow_up_prompts}
                resultProofState={resultState.proofState}
              />
              </section>

              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="routing-trace" className="rounded-xl border border-slate-200/80 bg-white px-5 shadow-sm">
                  <AccordionTrigger className="text-xs font-extrabold uppercase tracking-widest text-slate-600 hover:no-underline">
                    Show routing decision trace
                  </AccordionTrigger>
                  <AccordionContent>
                    <DecisionChain
                      observationResult={output.observation_result}
                      faultType={output.fault_type_v2}
                      recipientType={output.recipient_type}
                      assignedTeamId={output.assigned_team_id}
                      actionMessage={output.action_message}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="advanced-debug" className="rounded-xl border border-slate-200/80 bg-white px-5 shadow-sm">
                  <AccordionTrigger className="text-xs font-extrabold uppercase tracking-widest text-slate-500 hover:no-underline">
                    Advanced Debug Info
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                      For development and judging audit only.
                    </p>
                    <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                      {JSON.stringify(
                        {
                          perception_mode: triage.debug.perception_mode,
                          fallback_used: triage.debug.fallback_used,
                          rule_key: triage.debug.rule_key,
                          error_type: triage.perception.error_type,
                          scene_summary: triage.perception.scene_summary,
                          evidence_notes: output.evidence_notes,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </main>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <EvidencePanel
                imageUrl={imageUrl}
                annotations={triage.perception.extraction.bounding_boxes ?? []}
              />

              <NextStepRoutingCard resultState={resultState} output={output} />

              {(appScreenshotPrompt || hasAppScreenshot) && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="technical-label text-slate-500">EV App Screenshot</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                      {hasAppScreenshot
                        ? "EV app screenshot included in this triage result."
                        : appScreenshotPrompt?.prompt}
                    </p>
                  </div>

                  {!hasAppScreenshot && (
                    <div className="space-y-4">
                      <UploadDropzone
                        onFileSelect={(file) => {
                          setAppScreenshotFile(file);
                          setAppScreenshotError("");
                        }}
                        fileName={appScreenshotFile?.name}
                      />
                      {appScreenshotError && (
                        <p className="text-sm font-medium text-red-700">{appScreenshotError}</p>
                      )}
                      <Button
                        type="button"
                        onClick={handleAppScreenshotSubmit}
                        disabled={!appScreenshotFile || appScreenshotStatus === "uploading"}
                        className="h-11 w-full rounded-xl bg-green-600 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
                      >
                        {appScreenshotStatus === "uploading" ? "Parsing app screenshot..." : "Add App Screenshot"}
                      </Button>
                    </div>
                  )}
                </section>
              )}
            </aside>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function NextStepRoutingCard({
  resultState,
  output,
}: {
  resultState: ReturnType<typeof deriveResultState>;
  output: CompetitionOutput;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:p-6">
      <p className="technical-label text-slate-500">Routing control</p>
      <h2 className="mt-2 text-xl font-extrabold text-slate-950">Next Step</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{resultState.nextStep}</p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Case Status</p>
        <p className="mt-1 text-sm font-bold text-slate-950">{resultState.status}</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{resultState.recipientHelper}</p>
        {output.assigned_team_id && (
          <p className="mt-3 font-mono text-xs font-bold text-blue-700">{output.assigned_team_id}</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Button asChild className="h-11 rounded-xl bg-green-600 text-xs font-semibold text-white shadow-sm hover:bg-green-700">
          <a href={resultState.primaryCtaHref}>{resultState.primaryCtaLabel}</a>
        </Button>
        <a href="/history" className="text-center text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline">
          View incident audit
        </a>
      </div>
    </section>
  );
}

function DeviceTelemetryGrid({
  output,
  extraction,
  coreFields,
  componentFields,
}: {
  output: CompetitionOutput;
  extraction: Theme2VisualExtraction;
  coreFields: OrganizerOutputField[];
  componentFields: OrganizerOutputField[];
}) {
  const field = (fields: OrganizerOutputField[], label: string) => fields.find((item) => item.label === label)?.value || "Unknown";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <p className="technical-label text-slate-500">Device Telemetry</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">Result Summary</h2>
        </div>
        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
          Theme 2 required output
        </span>
        <RouteBadge recipientType={output.recipient_type} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="technical-label text-slate-500">System identifiers</p>
          <div className="mt-4 grid gap-3">
            <MetricRow label="Input Component" value={output.input_component} />
            <MetricRow label="Observation Result" value={output.observation_result} />
            <MetricRow label="Fault Type" value={output.fault_type_v2} />
            <MetricRow label="Recipient" value={output.recipient_type} />
            {output.assigned_team_id && <MetricRow label="Assigned Team" value={output.assigned_team_id} />}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="technical-label text-slate-500">Human-readable output</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompactMetric label="Component" value={field(coreFields, "Input Component")} />
            <CompactMetric label="Observation" value={field(coreFields, "Observation Result")} />
            <CompactMetric label="Issue Type" value={field(coreFields, "Fault Type")} />
            <CompactMetric label="Sent To" value={field(coreFields, "Recipient")} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="technical-label text-slate-500">Hardware keys</p>
          <div className="mt-4 space-y-3">
            <HardwareKey label="Serial Number" value={output.charger_serial_number || extraction.charger_serial_number || "Not readable"} />
            <HardwareKey label="Brand Model" value={output.charger_brand_model || extraction.charger_brand_model || "Not readable"} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="technical-label text-slate-500">Component Evidence</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {componentFields.map((item) => (
              <CompactMetric key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <code className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
        {value}
      </code>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <p className="technical-label text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function HardwareKey({ label, value }: { label: string; value: string }) {
  const copyValue = () => {
    if (value && value !== "Not readable") void navigator.clipboard.writeText(value);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="technical-label text-slate-500">{label}</p>
        <button
          type="button"
          onClick={copyValue}
          className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:text-slate-900"
          aria-label={`Copy ${label}`}
        >
          <Clipboard className="h-3.5 w-3.5" />
        </button>
      </div>
      <code className="mt-2 inline-block select-all rounded border border-slate-100 bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-slate-900">
        {value}
      </code>
    </div>
  );
}
