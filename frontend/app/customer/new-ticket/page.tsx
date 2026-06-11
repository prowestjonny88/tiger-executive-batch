"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LocateFixed } from "lucide-react";

import {
  addTicketEvidence,
  createTicketFromTriage,
  formatFaultTypeV2,
  formatInstallationSource,
  formatObservationResult,
  formatRecipientType,
  fetchPreview,
  fetchSites,
  fetchTriage,
  type ApiTriageResponse,
  type ChargerContext,
  type CustomerProfile,
  type UploadedPhotoEvidence,
  uploadIncidentPhoto,
} from "../../../lib/api";
import { extractChargerIdentitySuggestion, formatIdentityConfidence, type ChargerIdentitySuggestion } from "../../../lib/charger-identity";
import { loadDemoCustomerProfile, saveDemoCustomerProfile, useDemoRoleGuard } from "../../../lib/demo-role";
import { isValidMalaysiaPhoneNumber, toMalaysiaLocalNumber, toMalaysiaPhoneNumber } from "../../../lib/phone";
import { PageShell } from "../../../components/layout/page-shell";
import { UploadDropzone } from "../../../components/triage/upload-dropzone";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

type Step = 1 | 2 | 3 | 4;

const initialCustomer: CustomerProfile = {
  full_name: "",
  phone_number: "",
  whatsapp_number: "",
  email: "",
  preferred_contact_method: "whatsapp",
};

const initialContext: ChargerContext = {
  installation_address: "",
  customer_type: "home",
  installed_by: "unknown",
  installer_name: "",
  charger_serial_number: "",
  charger_brand_model: "",
  symptom_text: "",
  error_code: "",
  home_charger_location: "unknown",
  charger_location_notes: "",
  location_source: "manual",
};

const homeChargerLocationOptions = [
  { value: "car_porch", label: "Car porch" },
  { value: "garage", label: "Garage" },
  { value: "outdoor_wall", label: "Outdoor wall" },
  { value: "indoor_wall", label: "Indoor wall" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Not sure" },
];

const stepLabels: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Contact" },
  { step: 2, label: "Home Charger" },
  { step: 3, label: "Problem Photo" },
  { step: 4, label: "Diagnosis & Ticket" },
];

const CUSTOMER_DIRECT_TRIAGE = process.env.NEXT_PUBLIC_CUSTOMER_DIRECT_TRIAGE !== "false";

type CheckStage = "idle" | "uploading" | "previewing" | "checking" | "preparing" | "ready" | "error";
type CreateStage = "idle" | "creating" | "attaching_label" | "redirecting" | "error";

const checkStageLabels: Record<CheckStage, string> = {
  idle: "",
  uploading: "Uploading photo...",
  previewing: "Preparing intake...",
  checking: "Checking charger issue...",
  preparing: "Preparing diagnosis summary...",
  ready: "Diagnosis ready.",
  error: "Photo check needs retry.",
};

const createStageLabels: Record<CreateStage, string> = {
  idle: "",
  creating: "Creating support ticket...",
  attaching_label: "Attaching optional charger label photo...",
  redirecting: "Redirecting to ticket tracker...",
  error: "Ticket creation failed. Please retry.",
};

export default function NewTicketPage() {
  useDemoRoleGuard("customer");
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [customer, setCustomer] = useState<CustomerProfile>(initialCustomer);
  const [context, setContext] = useState<ChargerContext>(initialContext);
  const [file, setFile] = useState<File | null>(null);
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [labelPreviewUrl, setLabelPreviewUrl] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "ready" | "creating" | "error">("idle");
  const [checkStage, setCheckStage] = useState<CheckStage>("idle");
  const [createStage, setCreateStage] = useState<CreateStage>("idle");
  const [error, setError] = useState("");
  const [rememberDetails, setRememberDetails] = useState(true);
  const [customerResolved, setCustomerResolved] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "success" | "denied" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedPhotoEvidence | null>(null);
  const [labelEvidence, setLabelEvidence] = useState<UploadedPhotoEvidence | null>(null);
  const [triageResult, setTriageResult] = useState<ApiTriageResponse | null>(null);
  const [identitySuggestion, setIdentitySuggestion] = useState<ChargerIdentitySuggestion | null>(null);

  useEffect(() => {
    const saved = loadDemoCustomerProfile<CustomerProfile>();
    if (saved) setCustomer(saved);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!labelFile) {
      setLabelPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(labelFile);
    setLabelPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [labelFile]);

  const customerValid = useMemo(
    () =>
      customer.full_name.trim().length >= 2 &&
      isValidMalaysiaPhoneNumber(customer.phone_number) &&
      isValidMalaysiaPhoneNumber(customer.whatsapp_number) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
    [customer]
  );
  const contextValid = useMemo(
    () => context.installation_address.trim().length >= 8 && context.customer_type && context.installed_by,
    [context]
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Location is not supported by this browser. Please enter your address manually.");
      return;
    }

    setLocationStatus("locating");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setContext((current) => ({
          ...current,
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude,
          location_accuracy_m: position.coords.accuracy,
          location_source: "browser_geolocation",
        }));
        setLocationStatus("success");
      },
      (geoError) => {
        setLocationStatus(geoError.code === geoError.PERMISSION_DENIED ? "denied" : "error");
        setLocationError("Could not access your location. Please enter your address manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const logTiming = (label: string, startedAt: number) => {
    const elapsed = Math.round(performance.now() - startedAt);
    console.info(`[TIMING] ${label}: ${elapsed}ms`);
  };

  const getNormalizedCustomer = (): CustomerProfile => ({
    ...customer,
    phone_number: toMalaysiaPhoneNumber(customer.phone_number),
    whatsapp_number: toMalaysiaPhoneNumber(customer.whatsapp_number),
  });

  const startNewCheck = () => {
    setFile(null);
    setLabelFile(null);
    setUploadedEvidence(null);
    setLabelEvidence(null);
    setTriageResult(null);
    setIdentitySuggestion(null);
    setCustomerResolved(false);
    setError("");
    setState("idle");
    setCheckStage("idle");
    setCreateStage("idle");
    setStep(3);
  };

  const runTriageOnly = async () => {
    if (!file || state === "checking" || state === "creating") return;
    setState("checking");
    setCheckStage("uploading");
    setCreateStage("idle");
    setError("");
    setTriageResult(null);
    setIdentitySuggestion(null);
    setCustomerResolved(false);

    try {
      let siteId = "site-mall-01";
      try {
        const sites = await fetchSites();
        if (sites[0]) siteId = sites[0].site_id;
      } catch {
        /* local fallback for demos */
      }

      const uploadStartedAt = performance.now();
      const uploaded = await uploadIncidentPhoto(file);
      logTiming("uploadIncidentPhoto", uploadStartedAt);
      const photoHint = `Customer ticket photo: ${file.name}`;
      let incidentId: number | undefined;
      if (!CUSTOMER_DIRECT_TRIAGE) {
        setCheckStage("previewing");
        const previewStartedAt = performance.now();
        const preview = await fetchPreview({
          site_id: siteId,
          charger_id: context.charger_serial_number || undefined,
          photo_evidence: uploaded,
          photo_hint: photoHint,
          symptom_text: context.symptom_text || "",
          error_code: context.error_code || "",
          follow_up_answers: {},
        });
        logTiming("fetchPreview", previewStartedAt);
        incidentId = preview.incident_id;
      }
      setCheckStage("checking");
      const triageStartedAt = performance.now();
      const triage = await fetchTriage({
        incident_id: incidentId,
        site_id: siteId,
        charger_id: context.charger_serial_number || undefined,
        photo_evidence: uploaded,
        photo_hint: photoHint,
        symptom_text: context.symptom_text || "",
        error_code: context.error_code || "",
        follow_up_answers: {},
      });
      logTiming("fetchTriage", triageStartedAt);
      setCheckStage("preparing");
      const preparingStartedAt = performance.now();
      const suggestion = extractChargerIdentitySuggestion(triage, { labelPhotoUploaded: Boolean(labelFile) });
      logTiming("prepareDiagnosisSummary", preparingStartedAt);
      setUploadedEvidence(uploaded);
      setTriageResult(triage);
      setIdentitySuggestion(suggestion);
      setContext((current) => ({
        ...current,
        charger_serial_number: current.charger_serial_number || suggestion.serial_number || "",
        charger_brand_model: current.charger_brand_model || suggestion.brand_model || "",
      }));
      setState("ready");
      setCheckStage("ready");
    } catch (err) {
      setState("error");
      setCheckStage("error");
      setError(err instanceof Error ? err.message : "Photo check failed. Please try again.");
    }
  };

  const createTicketAfterIdentityReview = async () => {
    if (!triageResult || state === "creating") return;
    setState("creating");
    setCreateStage("creating");
    setError("");
    setCustomerResolved(false);

    try {
      const createStartedAt = performance.now();
      const normalizedCustomer = getNormalizedCustomer();
      const created = await createTicketFromTriage({
        incident_id: triageResult.incident_id,
        triage_result: triageResult,
        customer_profile: normalizedCustomer,
        charger_context: context,
        customer_comments: context.symptom_text || undefined,
      });
      logTiming("createTicketFromTriage", createStartedAt);
      if (labelFile) {
        try {
          setCreateStage("attaching_label");
          const labelUploadStartedAt = performance.now();
          const uploadedLabel = await uploadIncidentPhoto(labelFile);
          logTiming("uploadOptionalLabelPhoto", labelUploadStartedAt);
          setLabelEvidence(uploadedLabel);
          const evidenceStartedAt = performance.now();
          await addTicketEvidence(created.ticket_id, {
            evidence: uploadedLabel,
            evidence_type: "closeup",
            actor_role: "customer",
            actor_name: normalizedCustomer.full_name,
            message: "Customer uploaded charger label photo for brand/model and serial verification.",
          });
          logTiming("addTicketEvidence", evidenceStartedAt);
        } catch {
          /* Optional label evidence should not block the created ticket. */
        }
      }
      if (rememberDetails) saveDemoCustomerProfile(normalizedCustomer);
      setCreateStage("redirecting");
      router.push(`/customer/tickets/${created.ticket_id}`);
    } catch (err) {
      setState("error");
      setCreateStage("error");
      setError(
        `Ticket creation failed, but your diagnosis is still available. Please retry creating the support ticket.${
          err instanceof Error ? ` ${err.message}` : ""
        }`
      );
    }
  };

  return (
    <PageShell maxWidth="4xl">
      <Card className="app-card overflow-hidden p-6 md:p-10">
        <div className="mb-8">
          <p className="technical-label text-green-700">New Support Ticket</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Tell us what happened</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            ChargerDoc will collect customer context, check the photo, then generate a trackable support ticket.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stepLabels.map((item) => (
            <div
              key={item.step}
              className={`rounded-full px-3 py-2 text-center text-xs font-extrabold ${
                step >= item.step ? "bg-green-700 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {item.step}. {item.label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Customer Details</h2>
            <FormGrid>
              <TextInput label="Full name" value={customer.full_name} onChange={(value) => setCustomer({ ...customer, full_name: value })} />
              <MalaysiaPhoneInput
                label="Phone number"
                value={customer.phone_number}
                helper="Enter the number after +60."
                onChange={(value) => setCustomer({ ...customer, phone_number: value })}
              />
              <MalaysiaPhoneInput
                label="WhatsApp number"
                value={customer.whatsapp_number}
                helper="Enter the number after +60."
                onChange={(value) => setCustomer({ ...customer, whatsapp_number: value })}
              />
              <TextInput label="Email" value={customer.email} onChange={(value) => setCustomer({ ...customer, email: value })} />
              <SelectInput
                label="Preferred contact"
                value={customer.preferred_contact_method}
                onChange={(value) => setCustomer({ ...customer, preferred_contact_method: value as CustomerProfile["preferred_contact_method"] })}
                options={["whatsapp", "phone", "email"]}
              />
            </FormGrid>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={rememberDetails}
                onChange={(event) => setRememberDetails(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                Remember my contact details on this device
                <span className="block text-xs font-medium text-slate-500">Stored only in this demo browser.</span>
              </span>
            </label>
            <button
              type="button"
              className="text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
              onClick={() => {
                window.localStorage.removeItem("chargerdoc_customer_profile");
                setCustomer(initialCustomer);
                setRememberDetails(false);
              }}
            >
              Clear saved details
            </button>
            <StepActions
              canContinue={Boolean(customerValid)}
              onNext={() => {
                const normalizedCustomer = getNormalizedCustomer();
                setCustomer(normalizedCustomer);
                if (rememberDetails) saveDemoCustomerProfile(normalizedCustomer);
                setStep(2);
              }}
            />
            {!customerValid && (
              <p className="text-xs font-semibold text-slate-500">
                Enter a name, valid email, and Malaysian phone/WhatsApp numbers after +60.
              </p>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Home Charger Location and Issue Context</h2>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Installation address</Label>
              <Textarea
                value={context.installation_address}
                onChange={(event) => setContext({ ...context, installation_address: event.target.value, location_source: context.location_source || "manual" })}
                className="min-h-[90px] resize-none rounded-xl"
                placeholder="Enter the home address where the charger is installed."
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" className="rounded-xl" onClick={useCurrentLocation} disabled={locationStatus === "locating"}>
                  <LocateFixed className="mr-2 h-4 w-4" />
                  {locationStatus === "locating" ? "Capturing location..." : "Use Current Location"}
                </Button>
                <p className="text-xs font-semibold text-slate-500">
                  GPS coordinates help after-sales locate the charger, but the written home address is still required.
                </p>
              </div>
              {locationStatus === "success" && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-green-700">
                    GPS location captured. Please enter or confirm your full home address above.
                  </p>
                  {typeof context.location_lat === "number" && typeof context.location_lng === "number" && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      GPS captured: {context.location_lat.toFixed(6)}, {context.location_lng.toFixed(6)}
                      {typeof context.location_accuracy_m === "number" ? ` · accuracy ±${Math.round(context.location_accuracy_m)}m` : ""}
                    </p>
                  )}
                </div>
              )}
              {(locationStatus === "denied" || locationStatus === "error") && (
                <p className="text-xs font-bold text-amber-700">
                  {locationError || "Location was not captured. You can still enter the address manually."}
                </p>
              )}
            </div>
            <FormGrid>
              <SelectInput
                label="Home charger location"
                value={context.home_charger_location || "unknown"}
                onChange={(value) => setContext({ ...context, home_charger_location: value as ChargerContext["home_charger_location"] })}
                options={homeChargerLocationOptions}
              />
              <SelectInput
                label="Installed by"
                value={context.installed_by}
                onChange={(value) => setContext({ ...context, installed_by: value as ChargerContext["installed_by"] })}
                options={["rexharge", "third_party", "property_management", "unknown"]}
              />
            </FormGrid>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Describe the issue</Label>
              <Textarea
                value={context.symptom_text || ""}
                onChange={(event) => setContext({ ...context, symptom_text: event.target.value })}
                className="min-h-[100px] resize-none rounded-xl"
              />
            </div>
            <TextInput
              label="Error code shown on charger/app, if any"
              value={context.error_code || ""}
              onChange={(value) => setContext({ ...context, error_code: value })}
            />
            {context.installed_by === "third_party" && (
              <Alert variant="warning" className="rounded-2xl">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Third-party installation review</AlertTitle>
                <AlertDescription>
                  The after-sales team will review whether ChargerDoc service support or installer verification is required.
                </AlertDescription>
              </Alert>
            )}
            <StepActions canContinue={Boolean(contextValid)} onBack={() => setStep(1)} onNext={() => setStep(3)} />
            {!contextValid && (
              <p className="text-xs font-semibold text-slate-500">
                Add the installation address and installation source before uploading evidence.
              </p>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Evidence Upload</h2>
            <UploadDropzone
              onFileSelect={(selected) => {
                setFile(selected);
                setError("");
                setUploadedEvidence(null);
                setTriageResult(null);
                setIdentitySuggestion(null);
                setCustomerResolved(false);
                setState("idle");
                setCheckStage("idle");
                setCreateStage("idle");
              }}
              fileName={file?.name}
              fileSize={file?.size}
              previewUrl={previewUrl}
              title="Upload a photo of the charger issue"
              subtitle="Upload a clear photo of the charger, EVDB, isolator, or visible fault indicator."
            />
            <UploadDropzone
              onFileSelect={(selected) => {
                setLabelFile(selected);
                setLabelEvidence(null);
                setError("");
                setTriageResult(null);
                setIdentitySuggestion(null);
                setCustomerResolved(false);
                setState("idle");
                setCheckStage("idle");
                setCreateStage("idle");
              }}
              fileName={labelFile?.name}
              fileSize={labelFile?.size}
              previewUrl={labelPreviewUrl}
              title="Optional: Add charger label photo"
              subtitle="This helps after-sales verify your charger model and serial number faster."
            />
            <Alert className="rounded-2xl">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Safe photo reminder</AlertTitle>
              <AlertDescription>
                Take photos from a safe distance. Do not open the charger casing or electrical panels.
              </AlertDescription>
            </Alert>
            <StepActions canContinue={Boolean(file)} onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Diagnosis & Ticket</h2>
            <p className="text-sm font-medium leading-6 text-slate-600">
              ChargerDoc will inspect the uploaded problem photo and prepare a support-ticket summary.
            </p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
            {(state === "checking" || checkStage !== "idle") && !triageResult && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-800">
                {checkStageLabels[checkStage]}
              </div>
            )}
            {(state === "creating" || createStage === "error") && triageResult && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                {createStageLabels[createStage]}
              </div>
            )}
            {triageResult && (
              <Card className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <p className="technical-label text-green-700">Diagnosis Summary</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-950">What ChargerDoc found</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <SummaryBox label="Detected issue" value={formatObservationResult(triageResult.competition_output.observation_result)} />
                  <SummaryBox label="Likely fault type" value={formatFaultTypeV2(triageResult.competition_output.fault_type_v2)} />
                  <SummaryBox label="Recommended next step" value={getCustomerNextStep(triageResult)} />
                  <SummaryBox label="Urgency preview" value={getPriorityPreview(triageResult)} />
                  <SummaryBox label="Diagnosis Confidence" value={formatDiagnosisConfidence(getDiagnosisConfidenceScore(triageResult))} />
                </div>
                <p className="mt-4 rounded-xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
                  {getDiagnosisNote(triageResult)}
                </p>
                {formatDiagnosisConfidence(getDiagnosisConfidenceScore(triageResult)) === "Low" && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                    If this does not match what you see, create a support ticket or upload clearer evidence.
                  </p>
                )}
              </Card>
            )}
            {triageResult && isCustomerRouted(triageResult) && !needsProof(triageResult) && (
              <Card className="rounded-2xl border border-green-200 bg-white p-5">
                <p className="technical-label text-green-700">Try this first</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-950">Safe customer action</h3>
                <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-semibold leading-6 text-slate-800">
                  {triageResult.competition_output.action_message}
                </p>
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
                  Only perform simple visible checks. Do not open the charger casing, EVDB, isolator, or any electrical panels.
                </p>
                {customerResolved ? (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-extrabold text-green-800">Issue marked as solved.</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-green-800">
                      No support ticket was created because you indicated the issue was resolved.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={startNewCheck}>
                        Start a New Check
                      </Button>
                      <Button type="button" className="rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={() => router.push("/")}>
                        Go to Home
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => setCustomerResolved(true)}>
                    Issue Solved
                  </Button>
                )}
              </Card>
            )}
            {triageResult && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="technical-label text-slate-500">What happens next</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-950">{getWhatHappensNextTitle(triageResult)}</h3>
                <ol className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-600">
                  {getWhatHappensNextSteps(triageResult).map((item, index) => (
                    <li key={item}>{index + 1}. {item}</li>
                  ))}
                </ol>
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                  {getWhatHappensNextNote(triageResult)}
                </p>
              </Card>
            )}
            {triageResult && identitySuggestion && (
              <Card className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="technical-label text-slate-500">Optional Charger Details</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-950">Confirm details if you know them</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  If ChargerDoc detected or you know the charger details, confirm them below. You can also leave them blank.
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{identitySuggestion.note}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Charger Brand/Model"
                    value={context.charger_brand_model || ""}
                    onChange={(value) => setContext({ ...context, charger_brand_model: value })}
                  />
                  <TextInput
                    label="Charger Serial Number"
                    value={context.charger_serial_number || ""}
                    onChange={(value) => setContext({ ...context, charger_serial_number: value })}
                  />
                </div>
                <div className="mt-4 grid gap-3 text-xs font-bold text-slate-600 sm:grid-cols-3">
                  <span className="rounded-full bg-white px-3 py-2">Confidence: {formatIdentityConfidence(identitySuggestion.confidence)}</span>
                  <span className="rounded-full bg-white px-3 py-2">Source: {identitySuggestion.source.replaceAll("_", " ")}</span>
                  <span className="rounded-full bg-white px-3 py-2">
                    {identitySuggestion.needs_closeup ? "Close-up may be needed" : "Ready for customer confirmation"}
                  </span>
                </div>
              </Card>
            )}
            {!triageResult && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                {labelFile
                  ? "Charger label photo uploaded. ChargerDoc will use it as additional evidence for brand/model and serial verification."
                  : "No charger label photo uploaded. You can still check the problem photo and create the ticket."}
              </p>
            )}
            {uploadedEvidence && (
              <p className="text-xs font-semibold text-slate-500">
                Checked photo: {uploadedEvidence.filename}. Confirmed fields will be saved into the ticket.
              </p>
            )}
            {labelEvidence && (
              <p className="text-xs font-semibold text-slate-500">
                Charger label evidence attached: {labelEvidence.filename}.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(3)} disabled={state === "checking" || state === "creating"}>
                Back
              </Button>
              {!triageResult ? (
                <Button
                  className="rounded-xl bg-green-700 font-bold hover:bg-green-800"
                  onClick={runTriageOnly}
                  disabled={!file || state === "checking"}
                >
                  {state === "checking" ? checkStageLabels[checkStage] || "Checking photo..." : "Check Photo"}
                </Button>
              ) : (
                <Button
                  className="rounded-xl bg-green-700 font-bold hover:bg-green-800"
                  onClick={createTicketAfterIdentityReview}
                  disabled={state === "creating"}
                >
                  {getCreateTicketButtonLabel(triageResult, state, createStage)}
                </Button>
              )}
            </div>
          </section>
        )}
      </Card>
    </PageShell>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function SummaryBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="technical-label text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-extrabold leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function getCustomerNextStep(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  if (output.required_proof_next || triage.follow_up_prompts.length > 0) return "More proof may be needed";
  if (output.recipient_type === "after_sales_team") return "After-sales review required";
  if (output.recipient_type === "customer") return "Customer guidance available";
  if (output.recipient_type === "none") return "No routing required";
  return formatRecipientType(output.recipient_type);
}

function getPriorityPreview(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  if (output.required_proof_next || triage.follow_up_prompts.length > 0) return "Verification needed";
  if (output.recipient_type === "after_sales_team") return output.fault_type_v2 === "protection_issue" ? "High" : "Medium";
  if (output.recipient_type === "customer") return "Customer action";
  return "Low";
}

function getDiagnosisConfidenceScore(triage: ApiTriageResponse) {
  return (
    triage.competition_output?.confidence_score ??
    triage.perception?.confidence_score ??
    triage.perception?.extraction?.confidence_score ??
    null
  );
}

function formatDiagnosisConfidence(score?: number | null) {
  if (score == null) return "Not available";
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function isCustomerRouted(triage: ApiTriageResponse) {
  return triage.competition_output.recipient_type === "customer";
}

function needsProof(triage: ApiTriageResponse) {
  return Boolean(triage.competition_output.required_proof_next || triage.follow_up_prompts.length > 0);
}

function getCreateTicketButtonLabel(
  triage: ApiTriageResponse,
  state: "idle" | "checking" | "ready" | "creating" | "error",
  createStage: CreateStage
) {
  if (state === "creating") return createStageLabels[createStage] || "Creating support ticket...";
  if (state === "error" && createStage === "error") return "Retry Create Support Ticket";
  if (isCustomerRouted(triage) && !needsProof(triage)) return "Create Support Ticket if Issue Persists";
  return "Create Support Ticket";
}

function getDiagnosisNote(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  if (output.required_proof_next) return output.required_proof_next;
  if (triage.perception.hazard_signals.length > 0) return "Safety signals were detected. Keep distance and wait for proper support if unsure.";
  if (output.evidence_notes.length > 0) return output.evidence_notes[0];
  return output.action_message;
}

function getWhatHappensNextTitle(triage: ApiTriageResponse) {
  if (needsProof(triage)) return "More evidence may be needed";
  if (isCustomerRouted(triage)) return "Try the safe steps first";
  return "Create a support ticket and track progress";
}

function getWhatHappensNextSteps(triage: ApiTriageResponse) {
  if (needsProof(triage)) {
    return [
      "ChargerDoc needs clearer evidence to confirm the issue.",
      "You may upload the requested proof.",
      "You can still create a support ticket if the issue is urgent.",
    ];
  }
  if (isCustomerRouted(triage)) {
    return [
      "Try the safe steps shown above.",
      "If the issue is solved, no ticket is needed.",
      "If the issue persists, create a support ticket and after-sales can review it.",
    ];
  }
  return [
    "A support ticket will be created.",
    "After-sales staff will review your evidence and details.",
    "If needed, they may request more proof or schedule a visit.",
    "You can track everything from My Tickets.",
  ];
}

function getWhatHappensNextNote(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  if (output.required_proof_next || triage.follow_up_prompts.length > 0) return "More proof may be requested after ticket creation.";
  if (output.recipient_type === "after_sales_team") return "This will be routed to after-sales for review.";
  if (output.recipient_type === "customer") {
    return "This looks like a customer-action case. Try the safe step first, then create a ticket only if the issue persists.";
  }
  return "The ticket will store the diagnosis and evidence for your records.";
}

function TextInput({ label, value, helper, onChange }: { label: string; value: string; helper?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl" />
      {helper && <p className="text-xs font-semibold leading-5 text-slate-500">{helper}</p>}
    </div>
  );
}

function MalaysiaPhoneInput({
  label,
  value,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <div className="flex">
        <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-700">
          +60
        </span>
        <Input
          value={toMalaysiaLocalNumber(value)}
          onChange={(event) => onChange(toMalaysiaPhoneNumber(event.target.value))}
          className="rounded-l-none rounded-r-xl"
          placeholder="12 345 6789"
          inputMode="tel"
          autoComplete="tel-national"
        />
      </div>
      {helper && <p className="text-xs font-semibold leading-5 text-slate-500">{helper}</p>}
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
      >
        {options.map((option) => (
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
            {typeof option === "string" ? formatInstallationSource(option) : option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StepActions({
  canContinue,
  onBack,
  onNext,
}: {
  canContinue: boolean;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
      {onBack && (
        <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
          Back
        </Button>
      )}
      <Button type="button" className="rounded-xl bg-green-700 font-bold hover:bg-green-800" disabled={!canContinue} onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}
