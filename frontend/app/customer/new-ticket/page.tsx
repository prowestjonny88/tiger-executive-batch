"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LocateFixed } from "lucide-react";

import {
  addTicketEvidence,
  createTicketFromTriage,
  formatInstallationSource,
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
import { saveDemoCustomerProfile, useDemoRoleGuard } from "../../../lib/demo-role";
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
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "success" | "denied" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedPhotoEvidence | null>(null);
  const [labelEvidence, setLabelEvidence] = useState<UploadedPhotoEvidence | null>(null);
  const [triageResult, setTriageResult] = useState<ApiTriageResponse | null>(null);
  const [identitySuggestion, setIdentitySuggestion] = useState<ChargerIdentitySuggestion | null>(null);

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
      customer.phone_number.replace(/\D/g, "").length >= 7 &&
      customer.whatsapp_number.replace(/\D/g, "").length >= 7 &&
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

  const runTriageOnly = async () => {
    if (!file || state === "checking" || state === "creating") return;
    setState("checking");
    setError("");
    setTriageResult(null);
    setIdentitySuggestion(null);

    try {
      let siteId = "site-mall-01";
      try {
        const sites = await fetchSites();
        if (sites[0]) siteId = sites[0].site_id;
      } catch {
        /* local fallback for demos */
      }

      const uploaded = await uploadIncidentPhoto(file);
      const photoHint = `Customer ticket photo: ${file.name}`;
      const preview = await fetchPreview({
        site_id: siteId,
        charger_id: context.charger_serial_number || undefined,
        photo_evidence: uploaded,
        photo_hint: photoHint,
        symptom_text: context.symptom_text || "",
        error_code: context.error_code || "",
        follow_up_answers: {},
      });
      const triage = await fetchTriage({
        incident_id: preview.incident_id,
        site_id: siteId,
        charger_id: context.charger_serial_number || undefined,
        photo_evidence: uploaded,
        photo_hint: photoHint,
        symptom_text: context.symptom_text || "",
        error_code: context.error_code || "",
        follow_up_answers: {},
      });
      const suggestion = extractChargerIdentitySuggestion(triage, { labelPhotoUploaded: Boolean(labelFile) });
      setUploadedEvidence(uploaded);
      setTriageResult(triage);
      setIdentitySuggestion(suggestion);
      setContext((current) => ({
        ...current,
        charger_serial_number: current.charger_serial_number || suggestion.serial_number || "",
        charger_brand_model: current.charger_brand_model || suggestion.brand_model || "",
      }));
      setState("ready");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Photo check failed. Please try again.");
    }
  };

  const createTicketAfterIdentityReview = async () => {
    if (!triageResult || state === "creating") return;
    setState("creating");
    setError("");

    try {
      const created = await createTicketFromTriage({
        incident_id: triageResult.incident_id,
        triage_result: triageResult,
        customer_profile: customer,
        charger_context: context,
        customer_comments: context.symptom_text || undefined,
      });
      if (labelFile) {
        try {
          const uploadedLabel = await uploadIncidentPhoto(labelFile);
          setLabelEvidence(uploadedLabel);
          await addTicketEvidence(created.ticket_id, {
            evidence: uploadedLabel,
            evidence_type: "closeup",
            actor_role: "customer",
            actor_name: customer.full_name,
            message: "Customer uploaded charger label photo for brand/model and serial verification.",
          });
        } catch {
          /* Optional label evidence should not block the created ticket. */
        }
      }
      saveDemoCustomerProfile(customer);
      router.push(`/customer/tickets/${created.ticket_id}`);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Ticket creation failed. Please try again.");
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

        <div className="mb-8 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className={`rounded-full px-3 py-2 text-center text-xs font-extrabold ${
                step >= item ? "bg-green-700 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              Step {item}
            </div>
          ))}
        </div>

        {step === 1 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Customer Details</h2>
            <FormGrid>
              <TextInput label="Full name" value={customer.full_name} onChange={(value) => setCustomer({ ...customer, full_name: value })} />
              <TextInput label="Phone number" value={customer.phone_number} onChange={(value) => setCustomer({ ...customer, phone_number: value })} />
              <TextInput label="WhatsApp number" value={customer.whatsapp_number} onChange={(value) => setCustomer({ ...customer, whatsapp_number: value })} />
              <TextInput label="Email" value={customer.email} onChange={(value) => setCustomer({ ...customer, email: value })} />
              <SelectInput
                label="Preferred contact"
                value={customer.preferred_contact_method}
                onChange={(value) => setCustomer({ ...customer, preferred_contact_method: value as CustomerProfile["preferred_contact_method"] })}
                options={["whatsapp", "phone", "email"]}
              />
            </FormGrid>
            <StepActions canContinue={Boolean(customerValid)} onNext={() => setStep(2)} />
            {!customerValid && (
              <p className="text-xs font-semibold text-slate-500">
                Enter a name, valid email, and reachable phone/WhatsApp numbers to continue.
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
                  Location is approximate. Please confirm the exact home address and charger position.
                </p>
              </div>
              {locationStatus === "success" && (
                <p className="text-xs font-bold text-green-700">
                  Location captured. Please confirm your home address and charger position.
                </p>
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
                setState("idle");
              }}
              fileName={file?.name}
              fileSize={file?.size}
              previewUrl={previewUrl}
              title="Upload charger, EVDB, or isolator evidence"
              subtitle="Keep labels and switch positions visible where possible."
            />
            <UploadDropzone
              onFileSelect={(selected) => {
                setLabelFile(selected);
                setLabelEvidence(null);
                setError("");
                setTriageResult(null);
                setIdentitySuggestion(null);
                setState("idle");
              }}
              fileName={labelFile?.name}
              fileSize={labelFile?.size}
              previewUrl={labelPreviewUrl}
              title="Snap charger label for brand and serial number"
              subtitle="Optional but recommended. Take a close-up of the visible charger label so ChargerDoc can try to read the brand/model and serial number."
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
            <h2 className="text-xl font-extrabold text-slate-950">AI Check and Charger Details</h2>
            <p className="text-sm font-medium leading-6 text-slate-600">
              Check the photo before creating ticket. ChargerDoc will try to read the charger label, then you can confirm the details.
            </p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
            {triageResult && identitySuggestion && (
              <Card className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <p className="technical-label text-green-700">Detected Charger Details</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-950">Confirm or edit before creating the ticket</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  ChargerDoc checked the uploaded photo and tried to read the charger label. Please confirm the details before creating the ticket.
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
                  : "No charger label photo uploaded. ChargerDoc will try to detect details from the main issue photo if visible."}
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
                  {state === "checking" ? "Checking photo..." : "Check Photo"}
                </Button>
              ) : (
                <Button
                  className="rounded-xl bg-green-700 font-bold hover:bg-green-800"
                  onClick={createTicketAfterIdentityReview}
                  disabled={state === "creating"}
                >
                  {state === "creating" ? "Creating ticket..." : "Confirm and Create Ticket"}
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

function TextInput({ label, value, helper, onChange }: { label: string; value: string; helper?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl" />
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
