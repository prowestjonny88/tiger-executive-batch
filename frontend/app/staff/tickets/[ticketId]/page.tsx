"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, Copy, MessageCircle, Send, Wrench } from "lucide-react";

import {
  addTicketEvent,
  fetchScheduleSuggestions,
  fetchTicket,
  fetchWhatsAppPreview,
  formatFaultTypeV2,
  formatInputComponent,
  formatInstallationSource,
  formatObservationResult,
  resolveEvidenceUrl,
  scheduleTicket,
  updateTicketStatus,
  type ScheduleSuggestions,
  type TicketRecord,
  type TicketStatus,
  type WhatsAppPreview,
} from "../../../../lib/api";
import { useDemoRoleGuard } from "../../../../lib/demo-role";
import { formatTicketStatus, priorityClass, statusClass } from "../../../../lib/ticket-ui";
import { PageShell } from "../../../../components/layout/page-shell";
import { EvidencePanel } from "../../../../components/triage/evidence-panel";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";

const statusActions: Array<{ label: string; status: TicketStatus }> = [
  { label: "Request More Proof", status: "waiting_customer" },
  { label: "Assign", status: "assigned" },
  { label: "Mark In Progress", status: "in_progress" },
  { label: "Mark Resolved", status: "resolved" },
  { label: "Close Ticket", status: "closed" },
];

export default function StaffTicketDetailPage() {
  useDemoRoleGuard("staff");
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestions | null>(null);
  const [whatsApp, setWhatsApp] = useState<WhatsAppPreview | null>(null);
  const [note, setNote] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [showScheduling, setShowScheduling] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => {
    fetchTicket(ticketId)
      .then((data) => {
        setTicket(data);
        return Promise.all([fetchScheduleSuggestions(data.ticket_id), fetchWhatsAppPreview(data.ticket_id)]);
      })
      .then(([slotData, whatsAppData]) => {
        setSuggestions(slotData);
        setWhatsApp(whatsAppData);
        setSelectedSlot((current) => current || slotData.slots[0]?.scheduled_at || "");
        setSelectedTechnician((current) => current || slotData.technicians[0]?.name || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load ticket."));
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

  const annotations = ticket.triage_result?.perception?.extraction?.bounding_boxes ?? [];
  const evidenceUrl = resolveEvidenceUrl(ticket.evidence_photos[0]);
  const additionalProof = ticket.evidence_photos.slice(1);
  const proofEvents = ticket.events.filter((event) => event.event_type === "proof_uploaded");
  const isTerminalStatus = ["resolved", "closed", "cancelled"].includes(ticket.status);
  const shouldShowScheduling =
    !isTerminalStatus &&
    (showScheduling ||
      ticket.recipient_type === "after_sales_team" ||
      ["assigned", "scheduled", "reschedule_requested"].includes(ticket.status) ||
      ["pending", "scheduled", "reschedule_requested"].includes(ticket.schedule_status));

  const setStatus = async (status: TicketStatus) => {
    const updated = await updateTicketStatus(ticket.ticket_id, {
      status,
      actor_role: "staff",
      actor_name: "Demo Staff",
      note: note || `Staff changed status to ${formatTicketStatus(status)}.`,
    });
    setTicket(updated);
    setNote("");
  };

  const addInternalNote = async () => {
    if (!note.trim()) return;
    await addTicketEvent(ticket.ticket_id, {
      event_type: "staff_note_added",
      actor_role: "staff",
      actor_name: "Demo Staff",
      message: note,
      payload_json: {},
    });
    setNote("");
    refresh();
  };

  const scheduleVisit = async () => {
    const slot = suggestions?.slots.find((item) => item.scheduled_at === selectedSlot);
    if (!slot || !selectedTechnician) return;
    const updated = await scheduleTicket(ticket.ticket_id, {
      scheduled_at: slot.scheduled_at,
      scheduled_window: slot.scheduled_window,
      assigned_technician: selectedTechnician,
      actor_name: "Demo Staff",
    });
    setTicket(updated);
    refresh();
  };

  const markWhatsAppSent = async () => {
    await addTicketEvent(ticket.ticket_id, {
      event_type: "whatsapp_preview_marked_sent",
      actor_role: "staff",
      actor_name: "Demo Staff",
      message: "Staff marked the WhatsApp simulation message as sent.",
      payload_json: { simulation_only: true },
    });
    refresh();
  };

  return (
    <PageShell maxWidth="6xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-blue-700">Staff Ticket Detail</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{ticket.ticket_id}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">{ticket.ai_summary}</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/staff/dashboard">Back to queue</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="app-card p-6">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>{formatTicketStatus(ticket.status)}</span>
              {ticket.charger_context.installed_by === "third_party" && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  Warranty review required
                </span>
              )}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoBox label="Component" value={formatInputComponent(ticket.input_component)} />
              <InfoBox label="Observation" value={formatObservationResult(ticket.observation_result)} />
              <InfoBox label="Fault type" value={formatFaultTypeV2(ticket.fault_type_v2)} />
            </div>
          </Card>

          <Card className="app-card p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Customer and installation context</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox label="Customer" value={ticket.customer_profile.full_name} />
              <InfoBox label="Contact" value={`${ticket.customer_profile.phone_number} / ${ticket.customer_profile.email}`} />
              <InfoBox label="Address" value={ticket.charger_context.installation_address} />
              <InfoBox label="Installation source" value={formatInstallationSource(ticket.charger_context.installed_by)} />
              <InfoBox label="Charger identity" value={ticket.charger_context.charger_brand_model || ticket.charger_context.charger_serial_number || "Not provided"} />
              <InfoBox label="Customer comments" value={ticket.customer_comments || ticket.charger_context.symptom_text || "None"} />
            </div>
          </Card>

          {evidenceUrl && <EvidencePanel imageUrl={evidenceUrl} annotations={annotations} />}

          {(additionalProof.length > 0 || proofEvents.length > 0) && (
            <Card className="app-card p-6">
              <h2 className="mb-1 text-xl font-extrabold text-slate-950">Customer-uploaded proof for staff review</h2>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
                Supplemental proof is attached for staff review and does not imply automatic AI re-analysis.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {additionalProof.map((item, index) => {
                  const url = resolveEvidenceUrl(item);
                  return (
                    <a
                      key={`${item.storage_path || item.filename}-${index}`}
                      href={url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 hover:border-blue-300"
                    >
                      <p className="font-mono text-xs uppercase tracking-widest text-slate-500">{item.kind || "proof"}</p>
                      <p className="mt-2 text-slate-950">{item.filename || "Uploaded proof"}</p>
                    </a>
                  );
                })}
              </div>
              {proofEvents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {proofEvents.map((event) => (
                    <p key={event.id} className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-950">
                      {event.message}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="app-card p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Activity timeline</h2>
            <div className="space-y-4">
              {ticket.events.map((event) => (
                <div key={event.id} className="border-l-2 border-blue-200 pl-4">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{event.event_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{event.message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="app-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Wrench className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-extrabold text-slate-950">Status actions</h2>
            </div>
            <div className="mb-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Internal note</Label>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[90px] resize-none rounded-xl" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {statusActions.map((action) => (
                <Button key={action.status} variant="outline" className="rounded-xl" onClick={() => setStatus(action.status)}>
                  {action.label}
                </Button>
              ))}
              <Button className="rounded-xl bg-blue-700 font-bold hover:bg-blue-800" onClick={addInternalNote}>
                Add Note
              </Button>
            </div>
          </Card>

          {isTerminalStatus && ticket.scheduled_at ? (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-slate-500" />
                <h2 className="text-xl font-extrabold text-slate-950">Previous scheduled visit</h2>
              </div>
              <p className="text-sm font-semibold text-slate-700">{new Date(ticket.scheduled_at).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{ticket.scheduled_window}</p>
              {ticket.assigned_technician && (
                <p className="mt-1 text-sm font-semibold text-slate-700">Technician: {ticket.assigned_technician}</p>
              )}
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                This ticket is {formatTicketStatus(ticket.status).toLowerCase()}; scheduling controls are locked.
              </p>
            </Card>
          ) : shouldShowScheduling ? (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-extrabold text-slate-950">Assisted scheduling</h2>
              </div>
              <div className="space-y-4">
                <SelectField
                  label="Suggested slot"
                  value={selectedSlot}
                  onChange={setSelectedSlot}
                  options={(suggestions?.slots ?? []).map((slot) => ({
                    value: slot.scheduled_at,
                    label: `${new Date(slot.scheduled_at).toLocaleString()} / ${slot.scheduled_window}`,
                  }))}
                />
                <SelectField
                  label="Technician"
                  value={selectedTechnician}
                  onChange={setSelectedTechnician}
                  options={(suggestions?.technicians ?? []).map((tech) => ({
                    value: tech.name,
                    label: `${tech.name} / ${tech.skills.join(", ")} / ${tech.area}`,
                  }))}
                />
                <Button className="w-full rounded-xl bg-blue-700 font-bold hover:bg-blue-800" onClick={scheduleVisit}>
                  Schedule Visit
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-slate-500" />
                <h2 className="text-xl font-extrabold text-slate-950">Scheduling not required yet</h2>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Open scheduling manually only if staff decides a technician visit is needed.
              </p>
              <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => setShowScheduling(true)}>
                Open Scheduling
              </Button>
            </Card>
          )}

          {whatsApp && (
            <Card className="app-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-green-700" />
                <h2 className="text-xl font-extrabold text-slate-950">WhatsApp preview</h2>
              </div>
              <p className="rounded-xl bg-green-50 p-4 text-sm font-semibold leading-6 text-green-950">{whatsApp.message}</p>
              <p className="mt-3 text-xs font-bold text-slate-500">{whatsApp.label}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Button variant="outline" className="rounded-xl" onClick={() => navigator.clipboard.writeText(whatsApp.message)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={whatsApp.wa_url || "#"} target="_blank" rel="noreferrer">
                    <Send className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </Button>
                <Button className="rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={markWhatsAppSent}>
                  Mark Sent
                </Button>
              </div>
            </Card>
          )}

          {ticket.feedback.length > 0 && (
            <Card className="app-card p-6">
              <h2 className="text-xl font-extrabold text-slate-950">Customer feedback</h2>
              {ticket.feedback.map((item) => (
                <div key={item.id} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  <p>Resolved: {item.issue_resolved}</p>
                  <p>Support rating: {item.support_rating}/5</p>
                  <p>AI helpful: {item.ai_guidance_helpful}</p>
                  {item.comment && <p className="mt-2">{item.comment}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="technical-label text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-extrabold leading-6 text-slate-950">{value}</p>
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
  options: Array<{ value: string; label: string }>;
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
