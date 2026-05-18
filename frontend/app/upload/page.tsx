"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Power, Zap, Image as ImageIcon, CheckCircle2 } from "lucide-react";

import {
  fetchPreview,
  fetchScenarios,
  fetchSites,
  fetchTriage,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  formatRecipientType,
  type ScenarioOption,
  uploadIncidentPhoto,
} from "../../lib/api";
import { clearSession, writeSession } from "../../lib/triage-session";

import { PageShell } from "../../components/layout/page-shell";
import { UploadDropzone } from "../../components/triage/upload-dropzone";
import { CaptureTipCard } from "../../components/triage/capture-tip-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";

type UploadState = "idle" | "uploading" | "previewing" | "done" | "error";
type Mode = "manual" | "demo";

export default function PhotoUpload() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("manual");
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [chargerId, setChargerId] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  const showExpected = process.env.NEXT_PUBLIC_SHOW_DEMO_EXPECTED === "true";

  useEffect(() => {
    fetchScenarios()
      .then((data) => {
        setScenarios(data);
        setSelectedScenarioId(data[0]?.scenario_id ?? "");
      })
      .catch(() => {
        /* silently fallback - backend offline */
      });
  }, []);

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg("");
  };

  const handleContinue = async () => {
    if (state === "uploading" || state === "previewing") return;

    setState("uploading");
    setErrorMsg("");

    try {
      clearSession();

      if (mode === "demo" && selectedScenarioId) {
        const scenario = scenarios.find((item) => item.scenario_id === selectedScenarioId);
        if (!scenario) throw new Error("Scenario not found");

        writeSession({
          siteId: scenario.site_id,
          symptomText: scenario.symptom_text,
          errorCode: scenario.error_code,
          photoHint: scenario.photo_hint,
          followUpAnswers: scenario.follow_up_answers,
          demoScenarioId: scenario.scenario_id,
        });

        setState("previewing");

        const preview = await fetchPreview({
          site_id: scenario.site_id,
          photo_hint: scenario.photo_hint,
          symptom_text: scenario.symptom_text,
          error_code: scenario.error_code,
          follow_up_answers: scenario.follow_up_answers,
          demo_scenario_id: scenario.scenario_id,
        });

        writeSession({ preview, incidentId: preview.incident_id });

        const triage = await fetchTriage({
          incident_id: preview.incident_id,
          site_id: scenario.site_id,
          photo_hint: scenario.photo_hint,
          symptom_text: scenario.symptom_text,
          error_code: scenario.error_code,
          follow_up_answers: scenario.follow_up_answers,
          demo_scenario_id: scenario.scenario_id,
        });

        writeSession({ triage, incidentId: triage.incident_id });
        setState("done");
        router.push("/result");
        return;
      }

      let siteId = "site-mall-01";
      try {
        const sites = await fetchSites();
        if (sites[0]) siteId = sites[0].site_id;
      } catch {
        /* fallback */
      }

      let photoEvidence = undefined;
      if (file) {
        const uploaded = await uploadIncidentPhoto(file);
        photoEvidence = uploaded;
      }

      const photoHint = file ? `Photo: ${file.name}` : "";
      writeSession({
        siteId,
        chargerId: chargerId || undefined,
        symptomText,
        errorCode,
        photoHint,
        photoEvidence,
        followUpAnswers: {},
      });

      setState("previewing");

      const preview = await fetchPreview({
        site_id: siteId,
        charger_id: chargerId || undefined,
        photo_evidence: photoEvidence,
        photo_hint: photoHint,
        symptom_text: symptomText,
        error_code: errorCode,
        follow_up_answers: {},
      });

      writeSession({ preview, incidentId: preview.incident_id });
      setState("done");

      if (preview.follow_up_questions.length > 0) {
        router.push("/questions");
      } else {
        const triage = await fetchTriage({
          incident_id: preview.incident_id,
          site_id: siteId,
          charger_id: chargerId || undefined,
          photo_evidence: photoEvidence,
          photo_hint: photoHint,
          symptom_text: symptomText,
          error_code: errorCode,
          follow_up_answers: {},
        });
        writeSession({ triage, incidentId: triage.incident_id });
        router.push("/result");
      }
    } catch (error) {
      setState("error");
      setErrorMsg(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  const isBusy = state === "uploading" || state === "previewing";
  const statusLabel =
    state === "uploading"
      ? "Uploading photo..."
      : state === "previewing"
        ? "Analyzing evidence..."
        : state === "error"
          ? errorMsg
          : "";

  const selectedScenario = scenarios.find((item) => item.scenario_id === selectedScenarioId);

  return (
    <PageShell maxWidth="3xl">
      <Card className="p-8 md:p-12 border-slate-200 shadow-sm rounded-2xl w-full flex flex-col overflow-hidden bg-white">
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-green-700" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Report an EV Charger Issue</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Upload a photo of your charger, EVDB, or isolator. We'll identify the issue and guide you to the next step.
          </p>
        </div>

        <Tabs value={mode} onValueChange={(val) => setMode(val as Mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="manual" className="rounded-lg text-base">Upload Photo</TabsTrigger>
            <TabsTrigger value="demo" className="rounded-lg text-base">Demo Scenario</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-8">
            <UploadDropzone
              onFileSelect={handleFile}
              fileName={file?.name}
              className="bg-slate-50 hover:bg-slate-50/80"
            />
            <p className="text-xs font-medium text-slate-500">
              Large photos are optimized before upload to keep labels readable while avoiding deployment upload limits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="chargerId" className="text-xs font-bold uppercase tracking-widest text-slate-500">Charger ID (Optional)</Label>
                <Input
                  id="chargerId"
                  placeholder="e.g. RX-2049-A"
                  value={chargerId}
                  onChange={(e) => setChargerId(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-base py-6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="errorCode" className="text-xs font-bold uppercase tracking-widest text-slate-500">Error Code / App Code (Optional)</Label>
                <Input
                  id="errorCode"
                  placeholder="e.g. E-04"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-base py-6"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="symptom" className="text-xs font-bold uppercase tracking-widest text-slate-500">Describe the Issue</Label>
                <Textarea
                  id="symptom"
                  placeholder="e.g. Charger not responding, lights off..."
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  className="bg-slate-50 border-slate-200 min-h-[100px] text-base resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Helpful tips</h3>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CaptureTipCard icon={<ImageIcon className="w-5 h-5" />} text="Charger: indicator and serial label" />
                <CaptureTipCard icon={<Power className="w-5 h-5" />} text="EVDB: MCB/RCCB labels clearly" />
                <CaptureTipCard icon={<Zap className="w-5 h-5" />} text="Isolator: ON/OFF switch clearly" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="demo" className="space-y-8">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Select a Pre-Seeded Scenario</Label>
              <div className="flex flex-col gap-3">
                {scenarios.length === 0 ? (
                  <p className="text-slate-500">Loading scenarios...</p>
                ) : (
                  scenarios.map((scenario) => (
                    <button
                      key={scenario.scenario_id}
                      onClick={() => setSelectedScenarioId(scenario.scenario_id)}
                      className={`w-full text-left rounded-xl border-2 p-5 transition-all focus:outline-none ${
                        selectedScenarioId === scenario.scenario_id
                          ? "border-green-600 bg-green-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900 text-lg mb-1">{scenario.name}</p>
                          <p className="text-slate-600 mb-1">{scenario.symptom_text || scenario.headline}</p>
                        </div>
                        {selectedScenarioId === scenario.scenario_id && (
                          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      {showExpected && (
                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                          <p className="text-xs font-mono text-slate-500">
                            EXPECTED: {formatObservationResult(scenario.expected_observation_result)} | {formatFaultTypeV2(scenario.expected_fault_type_v2)}
                          </p>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {statusLabel && (
          <div className={`mt-8 px-4 py-3 rounded-lg text-sm font-medium ${state === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
            {state !== "error" && <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />}
            {statusLabel}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={isBusy || (mode === "demo" && !selectedScenarioId)}
            className="w-full h-14 text-lg font-bold bg-green-700 hover:bg-green-800 text-white rounded-xl shadow-sm"
          >
            {isBusy ? "Processing..." : "Continue"}
          </Button>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> Safe routing guaranteed
        </div>
      </Card>
    </PageShell>
  );
}
