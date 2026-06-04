"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, MessageCircle, UploadCloud } from "lucide-react";

import {
  addTicketEvent,
  fetchTicket,
  fetchWhatsAppPreview,
  formatFaultTypeV2,
  formatObservationResult,
  resolveEvidenceUrl,
  submitTicketFeedback,
  uploadIncidentPhoto,
  updateTicketStatus,
  type TicketRecord,
  type WhatsAppPreview,
} from "../../../../lib/api";
import { formatTicketStatus, nextActionForTicket, priorityClass, statusClass } from "../../../../lib/ticket-ui";
import { PageShell } from "../../../../components/layout/page-shell";
import { EvidencePanel } from "../../../../components/triage/evidence-panel";
import { UploadDropzone } from "../../../../components/triage/upload-dropzone";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";

export default function CustomerTicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [whatsApp, setWhatsApp] = useState<WhatsAppPreview | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofStatus, setProofStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({
    issue_resolved: "yes" as "yes" | "partially" | "no",
    support_rating: 5,
    ai_guidance_helpful: "yes" as "yes" | "somewhat" | "no",
    technician_rating: 5,
    comment: "",
  });

  const refresh = () => {
    fetchTicket(ticketId)
      .then(setTicket)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load ticket."));
    fetchWhatsAppPreview(ticketId).then(setWhatsApp).catch(() => setWhatsApp(null));
  };

  useEffect(refresh, [ticketId]);

  if (!ticket) {
    return (
      <PageShell maxWidth="4xl">
        <Card className="app-card p-8">
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : <p className="text-slate-500">Loading ticket...</p>}
        </Card>
      </PageShell>
    );
  }

  const evidenceUrl = resolveEvidenceUrl(ticket.evidence_photos[0]);
  const customerEvents = ticket.events.filter((event) => event.event_type !== "staff_note_added");

  const submitFeedback = async () => {
    const updated = await submitTicketFeedback(ticket.ticket_id, feedback);
    setTicket(updated);
  };

  const requestReschedule = async () => {
    const updated = await updateTicketStatus(ticket.ticket_id, {
      status: "reschedule_requested",
      actor_role: "customer",
      actor_name: ticket.customer_profile.full_name,
      note: "Customer requested schedule review.",
    });
    setTicket(updated);
  };

  const uploadProof = async () => {
    if (!proofFile || proofStatus === "uploading") return;
    setProofStatus("uploading");
    try {
      const uploaded = await uploadIncidentPhoto(proofFile);
      await addTicketEvent(ticket.ticket_id, {
        event_type: "proof_uploaded",
        actor_role: "customer",
        actor_name: ticket.customer_profile.full_name,
        message: `Customer uploaded additional proof: ${uploaded.filename}.`,
        payload_json: { evidence: uploaded },
      });
      setProofFile(null);
      setProofStatus("done");
      refresh();
    } catch {
      setProofStatus("error");
    }
  };

  return (
    <PageShell maxWidth="5xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-green-700">Customer Ticket Tracker</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{ticket.ticket_id}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">{nextActionForTicket(ticket.status, ticket.required_proof_next)}</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/customer/dashboard">Back to tickets</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="app-card p-6">
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
          </Card>

          {ticket.required_proof_next && (
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
                      {proofStatus === "uploading" ? "Uploading proof..." : "Upload Proof"}
                    </Button>
                    {proofStatus === "done" && <p className="text-xs font-bold text-amber-800">Proof uploaded and added to the ticket timeline.</p>}
                    {proofStatus === "error" && <p className="text-xs font-bold text-red-700">Proof upload failed. Please try again.</p>}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {evidenceUrl && <EvidencePanel imageUrl={evidenceUrl} annotations={[]} />}

          <Card id="ticket-timeline" className="app-card p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Ticket timeline</h2>
            <div className="space-y-4">
              {customerEvents.map((event) => (
                <div key={event.id} className="border-l-2 border-green-200 pl-4">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{event.event_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {event.event_type === "status_changed"
                      ? "Ticket status was updated by the support team."
                      : event.message}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {ticket.scheduled_at && (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-extrabold text-slate-950">Visit Scheduled</h2>
              </div>
              <p className="text-sm font-semibold text-slate-700">{new Date(ticket.scheduled_at).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{ticket.scheduled_window}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Technician: {ticket.assigned_technician}</p>
              <Button variant="outline" className="mt-5 w-full rounded-xl" onClick={requestReschedule}>
                Request Reschedule
              </Button>
            </Card>
          )}

          {whatsApp && (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-green-700" />
                <h2 className="text-xl font-extrabold text-slate-950">WhatsApp-style update</h2>
              </div>
              <p className="mb-3 rounded-xl bg-green-50 p-4 text-sm font-semibold leading-6 text-green-950">{whatsApp.message}</p>
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
                <Button variant="outline" className="rounded-xl" onClick={() => document.getElementById("proof-upload")?.scrollIntoView({ behavior: "smooth" })}>
                  Upload Proof
                </Button>
              </div>
            </Card>
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
                <Button className="w-full rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={submitFeedback}>
                  Submit Feedback
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
