"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  createTicketFromTriage,
  fetchPreview,
  fetchSites,
  fetchTriage,
  type ChargerContext,
  type CustomerProfile,
  uploadIncidentPhoto,
} from "../../../lib/api";
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
};

export default function NewTicketPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [customer, setCustomer] = useState<CustomerProfile>(initialCustomer);
  const [context, setContext] = useState<ChargerContext>(initialContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const customerValid = useMemo(
    () => customer.full_name && customer.phone_number && customer.whatsapp_number && customer.email,
    [customer]
  );
  const contextValid = useMemo(
    () => context.installation_address && context.customer_type && context.installed_by,
    [context]
  );

  const runTriageAndCreateTicket = async () => {
    if (!file || state === "running") return;
    setState("running");
    setError("");

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
      const created = await createTicketFromTriage({
        incident_id: triage.incident_id,
        triage_result: triage,
        customer_profile: customer,
        charger_context: context,
        customer_comments: context.symptom_text || undefined,
      });
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
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Charger and Installation Context</h2>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Installation address</Label>
              <Textarea
                value={context.installation_address}
                onChange={(event) => setContext({ ...context, installation_address: event.target.value })}
                className="min-h-[90px] resize-none rounded-xl"
              />
            </div>
            <FormGrid>
              <SelectInput
                label="Customer type"
                value={context.customer_type}
                onChange={(value) => setContext({ ...context, customer_type: value as ChargerContext["customer_type"] })}
                options={["home", "condo", "commercial", "public_site", "unknown"]}
              />
              <SelectInput
                label="Installed by"
                value={context.installed_by}
                onChange={(value) => setContext({ ...context, installed_by: value as ChargerContext["installed_by"] })}
                options={["rexharge", "third_party", "property_management", "unknown"]}
              />
              <TextInput label="Installer name" value={context.installer_name || ""} onChange={(value) => setContext({ ...context, installer_name: value })} />
              <TextInput label="Charger serial number" value={context.charger_serial_number || ""} onChange={(value) => setContext({ ...context, charger_serial_number: value })} />
              <TextInput label="Charger brand/model" value={context.charger_brand_model || ""} onChange={(value) => setContext({ ...context, charger_brand_model: value })} />
              <TextInput label="Error/app code" value={context.error_code || ""} onChange={(value) => setContext({ ...context, error_code: value })} />
            </FormGrid>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Describe the issue</Label>
              <Textarea
                value={context.symptom_text || ""}
                onChange={(event) => setContext({ ...context, symptom_text: event.target.value })}
                className="min-h-[100px] resize-none rounded-xl"
              />
            </div>
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
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Evidence Upload</h2>
            <UploadDropzone
              onFileSelect={(selected) => {
                setFile(selected);
                setError("");
              }}
              fileName={file?.name}
              fileSize={file?.size}
              previewUrl={previewUrl}
              title="Upload charger, EVDB, or isolator evidence"
              subtitle="Keep labels and switch positions visible where possible."
            />
            <Alert className="rounded-2xl">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Safe photo reminder</AlertTitle>
              <AlertDescription>Take photos from a safe distance. Do not open electrical panels unless authorized.</AlertDescription>
            </Alert>
            <StepActions canContinue={Boolean(file)} onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-slate-950">Create Ticket</h2>
            <p className="text-sm font-medium leading-6 text-slate-600">
              ChargerDoc will run Theme 2 triage, create a support ticket, and open the customer tracker.
            </p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(3)} disabled={state === "running"}>
                Back
              </Button>
              <Button
                className="rounded-xl bg-green-700 font-bold hover:bg-green-800"
                onClick={runTriageAndCreateTicket}
                disabled={!file || state === "running"}
              >
                {state === "running" ? "Checking photo and creating ticket..." : "Check Photo and Create Ticket"}
              </Button>
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

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl" />
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
          <option key={option} value={option}>
            {option.replace("_", " ")}
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
