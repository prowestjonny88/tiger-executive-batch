"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, MessageCircle, UploadCloud } from "lucide-react";

import {
  addTicketEvidence,
  fetchTicket,
  fetchWhatsAppPreview,
  formatFaultTypeV2,
  formatHomeChargerLocation,
  formatObservationResult,
  resolveEvidenceUrl,
  submitTicketFeedback,
  uploadIncidentPhoto,
  updateTicketStatus,
  type TicketRecord,
  type WhatsAppPreview,
} from "../../../../lib/api";
import { useDemoRoleGuard } from "../../../../lib/demo-role";
import { formatTicketStatus, nextActionForTicket, priorityClass, statusClass } from "../../../../lib/ticket-ui";
import { buildWhatsAppThread, hiddenCustomerEventTypes } from "../../../../lib/whatsapp-thread";
import { PageShell } from "../../../../components/layout/page-shell";
import { ButtonLoadingLabel, CommandCard, LoadingSpinner, PriorityBadge, StatusBadge, SupportCard, SupportTimeline, TicketDetailSkeleton } from "../../../../components/support";
import { EvidencePanel } from "../../../../components/triage/evidence-panel";
import { UploadDropzone } from "../../../../components/triage/upload-dropzone";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";

export default function CustomerTicketDetailPage() {
  useDemoRoleGuard("customer");
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [whatsApp, setWhatsApp] = useState<WhatsAppPreview | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofStatus, setProofStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isRequestingReschedule, setIsRequestingReschedule] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({
    issue_resolved: "yes" as "yes" | "partially" | "no",
    support_rating: 5,
    ai_guidance_helpful: "yes" as "yes" | "somewhat" | "no",
    technician_rating: 5,
    comment: "",
  });

  const refresh = () => {
    setIsLoadingTicket((current) => current || !ticket);
    setIsLoadingWhatsApp(true);
    fetchTicket(ticketId)
      .then(setTicket)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load ticket."))
      .finally(() => setIsLoadingTicket(false));
    fetchWhatsAppPreview(ticketId)
      .then(setWhatsApp)
      .catch(() => setWhatsApp(null))
      .finally(() => setIsLoadingWhatsApp(false));
  };

  useEffect(refresh, [ticketId]);
  const whatsAppThread = useMemo(() => (ticket ? buildWhatsAppThread(ticket) : []), [ticket]);

  if (!ticket) {
    return (
      <PageShell maxWidth="6xl" density="detail">
        {error && !isLoadingTicket ? (
          <Card className="app-card p-8">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </Card>
        ) : (
          <TicketDetailSkeleton />
        )}
      </PageShell>
    );
  }

  const evidenceUrl = resolveEvidenceUrl(ticket.evidence_photos[0]);
  const annotations = ticket.triage_result?.perception?.extraction?.bounding_boxes ?? [];
  const customerEvents = ticket.events.filter((event) => !hiddenCustomerEventTypes.has(event.event_type));
  const needsProof = ticket.status === "waiting_customer" && Boolean(ticket.required_proof_next);
  const hasUploadedProof = ticket.events.some((event) => event.event_type === "proof_uploaded");
  const isTerminalStatus = ["resolved", "closed", "cancelled"].includes(ticket.status);
  const canRequestReschedule = Boolean(ticket.scheduled_at) && !isTerminalStatus;
  const chargerIdentity =
    ticket.charger_context.charger_brand_model || ticket.charger_context.charger_serial_number
      ? `${ticket.charger_context.charger_brand_model || "Brand/model not provided"} / ${
          ticket.charger_context.charger_serial_number || "Serial not provided"
        }`
      : "Not provided";
  const timelineItems = customerEvents.map((event) => ({
    title: event.event_type.replaceAll("_", " "),
    body:
      event.event_type === "status_changed"
        ? `Your ticket status is now: ${formatTicketStatus(String(event.payload_json?.status || event.payload_json?.new_status || ticket.status))}.`
        : event.message,
    timestamp: new Date(event.created_at).toLocaleString(),
  }));

  const submitFeedback = async () => {
    if (isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      const updated = await submitTicketFeedback(ticket.ticket_id, feedback);
      setTicket(updated);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const requestReschedule = async () => {
    if (isRequestingReschedule) return;
    setIsRequestingReschedule(true);
    try {
      const updated = await updateTicketStatus(ticket.ticket_id, {
        status: "reschedule_requested",
        actor_role: "customer",
        actor_name: ticket.customer_profile.full_name,
        note: "Customer requested schedule review.",
      });
      setTicket(updated);
    } finally {
      setIsRequestingReschedule(false);
    }
  };

  const uploadProof = async () => {
    if (!proofFile || proofStatus === "uploading") return;
    setProofStatus("uploading");
    try {
      const uploaded = await uploadIncidentPhoto(proofFile);
      const updated = await addTicketEvidence(ticket.ticket_id, {
        evidence: uploaded,
        evidence_type: "closeup",
        actor_role: "customer",
        actor_name: ticket.customer_profile.full_name,
        message: `Customer uploaded additional proof: ${uploaded.filename}.`,
      });
      setTicket(updated);
      setProofFile(null);
      setProofStatus("done");
      refresh();
    } catch {
      setProofStatus("error");
    }
  };

  return (
    <PageShell maxWidth="6xl" density="detail">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-green-700">Customer Ticket Tracker</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Ticket Details</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            We are tracking this charger issue and will show the current step first.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/customer/dashboard">Back to tickets</Link>
        </Button>
      </div>

      <CommandCard tone={needsProof ? "amber" : "green"} className="mb-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-extrabold text-slate-700">
                {ticket.ticket_id}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-950">{formatObservationResult(ticket.observation_result)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">{formatFaultTypeV2(ticket.fault_type_v2)}</p>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-700">
              {needsProof
                ? "More proof is needed before after-sales can continue reviewing this ticket."
                : "No action is needed from you right now unless the ticket requests more proof."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {whatsApp?.wa_url && (
              <Button asChild className="rounded-xl bg-green-700 font-bold hover:bg-green-800">
                <a href={whatsApp.wa_url} target="_blank" rel="noreferrer">Open WhatsApp</a>
              </Button>
            )}
            {needsProof && (
              <Button variant="outline" className="rounded-xl bg-white" onClick={() => document.getElementById("proof-upload")?.scrollIntoView({ behavior: "smooth" })}>
                Upload More Proof
              </Button>
            )}
          </div>
        </div>
      </CommandCard>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SupportCard className="p-6">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>
                {formatTicketStatus(ticket.status)}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(ticket.priority)}`}>
                {ticket.priority} Priority
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <SummaryBox label="Detected issue" value={formatObservationResult(ticket.observation_result)} />
              <SummaryBox label="Fault type" value={formatFaultTypeV2(ticket.fault_type_v2)} />
              <SummaryBox label="Route" value={ticket.assigned_team_id || ticket.recipient_type.replace("_", " ")} />
            </div>
          </SupportCard>

          <div className="grid gap-4 md:grid-cols-2">
            <SupportCard className="p-6">
              <p className="technical-label text-green-700">Current Status</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">{formatTicketStatus(ticket.status)}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Last updated {new Date(ticket.updated_at || ticket.created_at).toLocaleString()}.
              </p>
            </SupportCard>
            <SupportCard className="p-6">
              <p className="technical-label text-green-700">Next Action</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">
                {needsProof ? "Upload requested proof" : "No action needed right now"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {nextActionForTicket(ticket.status, ticket.required_proof_next)}
              </p>
            </SupportCard>
          </div>

          {needsProof && (
            <Card id="proof-upload" className="rounded-2xl border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <UploadCloud className="mt-1 h-5 w-5 text-amber-700" />
                <div>
                  <h2 className="font-extrabold text-amber-950">More proof needed</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">{ticket.required_proof_next}</p>
                  <div className="mt-4 space-y-3">
                    <UploadDropzone
                      onFileSelect={(selected) => {
                        setProofFile(selected);
                        setProofStatus("idle");
                      }}
                      fileName={proofFile?.name}
                      title="Upload additional proof"
                      subtitle="Add the requested close-up or app screenshot."
                    />
                    <Button
                      className="rounded-xl bg-amber-600 font-bold hover:bg-amber-700"
                      disabled={!proofFile || proofStatus === "uploading"}
                      onClick={uploadProof}
                    >
                      {proofStatus === "uploading" ? <ButtonLoadingLabel label="Uploading proof..." /> : "Upload Proof"}
                    </Button>
                    {proofStatus === "uploading" && (
                      <p className="text-xs font-bold text-amber-800">Uploading and attaching this proof to your ticket.</p>
                    )}
                    {proofStatus === "done" && <p className="text-xs font-bold text-amber-800">Proof uploaded. Your ticket has returned to after-sales review.</p>}
                    {proofStatus === "error" && <p className="text-xs font-bold text-red-700">Proof upload failed. Please try again.</p>}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {!needsProof && (proofStatus === "done" || hasUploadedProof) && (
            <Card className="rounded-2xl border-green-200 bg-green-50 p-5">
              <h2 className="font-extrabold text-green-950">Proof received</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-green-900">
                Proof uploaded. Your ticket has returned to after-sales review.
              </p>
            </Card>
          )}

          {evidenceUrl && <EvidencePanel imageUrl={evidenceUrl} annotations={annotations} />}

          <SupportCard id="ticket-timeline" className="p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Ticket timeline</h2>
            <SupportTimeline items={timelineItems} />
          </SupportCard>
        </div>

        <div className="space-y-6">
          <SupportCard className="p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Uploaded Proof</h2>
            <div className="space-y-3 text-sm font-semibold leading-6 text-slate-600">
              <SummaryBox label="Main issue photo" value={ticket.evidence_photos[0]?.filename || "Uploaded evidence available"} />
              <SummaryBox label="Additional proof" value={`${Math.max(ticket.evidence_photos.length - 1, 0)} file(s) attached`} />
              {needsProof && (
                <Button variant="outline" className="w-full rounded-xl" onClick={() => document.getElementById("proof-upload")?.scrollIntoView({ behavior: "smooth" })}>
                  Upload More Proof
                </Button>
              )}
            </div>
          </SupportCard>

          <SupportCard className="p-6" aria-label="Charger / Installation Details">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Home charger details</h2>
            <div className="grid gap-4">
              <SummaryBox label="Charger details" value={chargerIdentity} />
              <SummaryBox label="Address" value={ticket.charger_context.installation_address} />
              <SummaryBox label="Charger position" value={formatHomeChargerLocation(ticket.charger_context.home_charger_location)} />
              {ticket.charger_context.charger_location_notes && (
                <SummaryBox label="Location notes" value={ticket.charger_context.charger_location_notes} />
              )}
              <SummaryBox
                label="GPS status"
                value={
                  ticket.charger_context.location_lat != null && ticket.charger_context.location_lng != null
                    ? "GPS captured"
                    : "GPS not captured"
                }
              />
            </div>
          </SupportCard>

          {ticket.scheduled_at && (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-extrabold text-slate-950">
                  {isTerminalStatus ? "Previous Scheduled Visit" : "Visit Scheduled"}
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-700">{new Date(ticket.scheduled_at).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{ticket.scheduled_window}</p>
              {ticket.assigned_technician && (
                <p className="mt-1 text-sm font-semibold text-slate-700">Technician: {ticket.assigned_technician}</p>
              )}
              {canRequestReschedule && (
                <Button variant="outline" className="mt-5 w-full rounded-xl" onClick={requestReschedule}>
                  {isRequestingReschedule ? <ButtonLoadingLabel label="Requesting..." /> : "Request Reschedule"}
                </Button>
              )}
            </Card>
          )}

          {whatsApp && (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-green-700" />
                <h2 className="text-xl font-extrabold text-slate-950">WhatsApp-style update</h2>
              </div>
              <div className="mb-3 space-y-3">
                {whatsAppThread.length > 0 ? (
                  whatsAppThread.map((bubble) => (
                    <div
                      key={bubble.id}
                      className={`rounded-xl p-3 text-sm font-semibold leading-6 ${
                        bubble.align === "right"
                          ? "ml-auto bg-green-700 text-white"
                          : "mr-auto bg-green-50 text-green-950"
                      }`}
                    >
                      <p>{bubble.message}</p>
                      <p className={`mt-1 text-[11px] ${bubble.align === "right" ? "text-green-100" : "text-green-700"}`}>
                        {new Date(bubble.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-green-50 p-4 text-sm font-semibold leading-6 text-green-950">{whatsApp.message}</p>
                )}
              </div>
              <p className="text-xs font-bold text-slate-500">{whatsApp.label}</p>
              {whatsApp.wa_url && (
                <Button asChild variant="outline" className="mt-4 w-full rounded-xl">
                  <a href={whatsApp.wa_url} target="_blank" rel="noreferrer">Open WhatsApp</a>
                </Button>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="rounded-xl" onClick={() => document.getElementById("ticket-timeline")?.scrollIntoView({ behavior: "smooth" })}>
                  Check Status
                </Button>
                {needsProof && (
                  <Button variant="outline" className="rounded-xl" onClick={() => document.getElementById("proof-upload")?.scrollIntoView({ behavior: "smooth" })}>
                    Upload Proof
                  </Button>
                )}
              </div>
            </Card>
          )}
          {!whatsApp && isLoadingWhatsApp && (
            <SupportCard className="p-6">
              <LoadingSpinner label="Preparing WhatsApp update..." />
            </SupportCard>
          )}

          {ticket.status === "resolved" && (
            <Card className="app-card p-6">
              <h2 className="text-xl font-extrabold text-slate-950">Confirm resolution</h2>
              <div className="mt-5 space-y-4">
                <SelectField label="Issue resolved" value={feedback.issue_resolved} options={["yes", "partially", "no"]} onChange={(value) => setFeedback({ ...feedback, issue_resolved: value as typeof feedback.issue_resolved })} />
                <SelectField label="Support rating" value={String(feedback.support_rating)} options={["1", "2", "3", "4", "5"]} onChange={(value) => setFeedback({ ...feedback, support_rating: Number(value) })} />
                <SelectField label="AI guidance helpful" value={feedback.ai_guidance_helpful} options={["yes", "somewhat", "no"]} onChange={(value) => setFeedback({ ...feedback, ai_guidance_helpful: value as typeof feedback.ai_guidance_helpful })} />
                <SelectField label="Technician rating" value={String(feedback.technician_rating)} options={["1", "2", "3", "4", "5"]} onChange={(value) => setFeedback({ ...feedback, technician_rating: Number(value) })} />
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Comment</Label>
                  <Textarea value={feedback.comment} onChange={(event) => setFeedback({ ...feedback, comment: event.target.value })} className="resize-none rounded-xl" />
                </div>
                <Button className="w-full rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={submitFeedback} disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? <ButtonLoadingLabel label="Submitting..." /> : "Submit Feedback"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="technical-label text-slate-500">{label}</p>
      <p className="mt-2 text-base font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function SelectField({
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
