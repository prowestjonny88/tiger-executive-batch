"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import svgPaths from "../../imports/2PhotoUpload/svg-cwyu35rr3g";
import {
  fetchPreview,
  fetchScenarios,
  fetchSites,
  fetchTriage,
  formatIssueType,
  type ScenarioOption,
  uploadIncidentPhoto,
} from "../../lib/api";
import { clearSession, writeSession } from "../../lib/triage-session";

type UploadState = "idle" | "uploading" | "previewing" | "done" | "error";
type Mode = "manual" | "demo";

export default function PhotoUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("manual");
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [chargerId, setChargerId] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

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

  const handleFile = (file: File) => {
    setFileName(file.name);
    setErrorMsg("");
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
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
      const files = fileInputRef.current?.files;
      if (files && files[0]) {
        const uploaded = await uploadIncidentPhoto(files[0]);
        photoEvidence = uploaded;
      }

      const photoHint = fileName ? `Photo: ${fileName}` : "";
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
  const issueColors: Record<string, string> = {
    no_power: "bg-red-50 border-red-300 text-red-700",
    tripping: "bg-amber-50 border-amber-300 text-amber-800",
    charging_slow: "bg-green-50 border-green-300 text-green-800",
    not_responding: "bg-slate-100 border-slate-300 text-slate-700",
    unknown_mixed: "bg-slate-100 border-slate-300 text-slate-700",
  };
  const outcomeLabels: Record<string, string> = {
    driver: "Expected: Driver",
    local_site: "Expected: Local Site",
    remote_ops: "Expected: Remote Ops",
    technician: "Expected: Technician",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16 relative">
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 md:p-12 w-full flex flex-col relative overflow-hidden">
        <div className="absolute right-0 top-0 pointer-events-none opacity-90">
          <svg className="w-32 h-32" fill="none" viewBox="0 0 128 128">
            <g clipPath="url(#clip0_2_800)">
              <path d="M0 0H128V128L0 0" fill="#006E28" />
            </g>
            <defs>
              <clipPath id="clip0_2_800">
                <rect fill="white" height="128" width="128" />
              </clipPath>
            </defs>
          </svg>
        </div>

        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Report a Charger Issue</h1>
          <p className="text-slate-600 text-lg">Upload a photo or use a demo scenario to get a live triage result.</p>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${mode === "manual" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-800"}`}
          >
            Upload Photo
          </button>
          <button
            id="demo-mode-toggle"
            onClick={() => setMode("demo")}
            className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${mode === "demo" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-800"}`}
          >
            Demo Scenario
          </button>
        </div>

        {mode === "demo" ? (
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-3">
              Select a Pre-Seeded Scenario
            </label>
            <div className="flex flex-col gap-3">
              {scenarios.length === 0 ? (
                <p className="text-slate-500 text-sm">Loading scenarios... (requires backend at http://127.0.0.1:8001)</p>
              ) : (
                scenarios.map((scenario) => (
                  <button
                    key={scenario.scenario_id}
                    onClick={() => setSelectedScenarioId(scenario.scenario_id)}
                    className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                      selectedScenarioId === scenario.scenario_id
                        ? "border-green-500 bg-green-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900 mb-1">{scenario.name}</p>
                        <p className="text-slate-600 text-sm">{scenario.headline}</p>
                        <p className="text-slate-500 text-xs mt-1 font-mono">ERR: {scenario.error_code}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest border rounded-md px-2 py-1 whitespace-nowrap flex-shrink-0 ${issueColors[scenario.expected_issue_family] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {formatIssueType(scenario.expected_issue_family)}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      {outcomeLabels[scenario.expected_resolver_tier] ?? scenario.expected_resolver_tier}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center min-h-[160px] p-8 relative mb-6 transition-colors hover:bg-slate-100 hover:border-green-400 group cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-slate-200 text-green-700 w-14 h-14 flex flex-col items-center justify-center rounded-xl mb-3 group-hover:bg-green-100 transition-colors shadow-sm">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 30 27">
                  <path d={svgPaths.p177cbc00} fill="currentColor" />
                </svg>
              </div>
              {fileName ? (
                <p className="font-bold text-slate-900 text-base mb-1">{fileName}</p>
              ) : (
                <>
                  <p className="font-semibold text-slate-900 text-base mb-1">Tap to capture or upload</p>
                  <p className="text-slate-500 text-sm">JPEG, PNG up to 10MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-1">Charger ID</label>
                <input
                  type="text"
                  placeholder="e.g. RX-2049-A"
                  value={chargerId}
                  onChange={(event) => setChargerId(event.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-1">Error Code</label>
                <input
                  type="text"
                  placeholder="e.g. E-04"
                  value={errorCode}
                  onChange={(event) => setErrorCode(event.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-1">Describe the Issue</label>
                <textarea
                  placeholder="e.g. Charger not responding, lights off, vehicle not pairing..."
                  value={symptomText}
                  onChange={(event) => setSymptomText(event.target.value)}
                  rows={2}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner text-sm resize-none"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px bg-slate-300 w-6"></div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Capture Tips</h3>
                <div className="h-px bg-slate-300 flex-1"></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-3 flex items-center gap-3 shadow-sm">
                  <svg className="w-5 h-5 text-green-800 flex-shrink-0" fill="none" viewBox="0 0 15 13.5"><path d={svgPaths.p19c07780} fill="currentColor" /></svg>
                  <span className="text-sm font-semibold text-slate-800">Include screen</span>
                </div>
                <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-3 flex items-center gap-3 shadow-sm">
                  <svg className="w-5 h-5 text-green-800 flex-shrink-0" fill="none" viewBox="0 0 13.5 13.5"><path d={svgPaths.p2d5bbe80} fill="currentColor" /></svg>
                  <span className="text-sm font-semibold text-slate-800">Show connector</span>
                </div>
                <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-3 flex items-center gap-3 shadow-sm">
                  <svg className="w-5 h-5 text-green-800 flex-shrink-0" fill="none" viewBox="0 0 16.5 16.5"><path d={svgPaths.p33c29780} fill="currentColor" /></svg>
                  <span className="text-sm font-semibold text-slate-800">Avoid glare</span>
                </div>
              </div>
            </div>
          </>
        )}

        {statusLabel ? (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${state === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"}`}>
            {state !== "error" ? <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" /> : null}
            {statusLabel}
          </div>
        ) : null}

        {mode === "demo" && selectedScenario ? (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-700">
            <span className="font-bold">Ready to run: </span>
            {selectedScenario.headline} | {formatIssueType(selectedScenario.expected_issue_family)} |{" "}
            {outcomeLabels[selectedScenario.expected_resolver_tier] ?? selectedScenario.expected_resolver_tier}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <button
            id="upload-continue-btn"
            onClick={() => void handleContinue()}
            disabled={isBusy || (mode === "demo" && !selectedScenarioId)}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 w-full"
          >
            {isBusy ? "Processing..." : mode === "demo" ? "Run Demo Triage" : "Continue"}
            {!isBusy ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 13.3333 13.3333">
                <path d={svgPaths.p32510800} fill="currentColor" />
              </svg>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
