"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarClock, Copy, MessageCircle, Send, Wrench } from "lucide-react";

import {
  addTicketEvent,
  fetchScheduleSuggestions,
  fetchTicket,
  fetchWhatsAppPreview,
  formatFaultTypeV2,
  formatHomeChargerLocation,
  formatInputComponent,
  formatInstallationSource,
  formatLocationSource,
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
import { getProofStatus, getScheduleStatus, getTicketActionNeeded } from "../../../../lib/ticket-actions";
import { formatTicketStatus, priorityClass, statusClass } from "../../../../lib/ticket-ui";
import { PageShell } from "../../../../components/layout/page-shell";
import {
  ActionPanelCard,
  ButtonLoadingLabel,
  CommandHeader,
  LoadingSpinner,
  PriorityBadge,
  StatusBadge,
  SupportCard,
  SupportTimeline,
  TicketDetailSkeleton,
} from "../../../../components/support";
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
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isLoadingAuxiliary, setIsLoadingAuxiliary] = useState(true);
  const [submittingStatus, setSubmittingStatus] = useState<TicketStatus | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isMarkingWhatsApp, setIsMarkingWhatsApp] = useState(false);

  const refresh = () => {
    setIsLoadingTicket((current) => current || !ticket);
    setIsLoadingAuxiliary(true);
    fetchTicket(ticketId)
      .then((data) => {
        setTicket(data);
        setIsLoadingTicket(false);
        return Promise.all([fetchScheduleSuggestions(data.ticket_id), fetchWhatsAppPreview(data.ticket_id)]);
      })
      .then(([slotData, whatsAppData]) => {
        setSuggestions(slotData);
        setWhatsApp(whatsAppData);
        setSelectedSlot((current) => current || slotData.slots[0]?.scheduled_at || "");
        setSelectedTechnician((current) => current || slotData.technicians[0]?.name || "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load ticket.");
        setIsLoadingTicket(false);
      })
      .finally(() => setIsLoadingAuxiliary(false));
  };

  useEffect(refresh, [ticketId]);

  if (!ticket) {
    return (
      <PageShell maxWidth="7xl" density="detail">
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

  const annotations = ticket.triage_result?.perception?.extraction?.bounding_boxes ?? [];
  const evidenceUrl = resolveEvidenceUrl(ticket.evidence_photos[0]);
  const additionalProof = ticket.evidence_photos.slice(1);
  const proofEvents = ticket.events.filter((event) => event.event_type === "proof_uploaded");
  const chargerLabelEvidenceNames = new Set(
    proofEvents
      .filter((event) => /charger label photo/i.test(event.message))
      .map((event) => {
        const payload = event.payload_json || {};
        const evidence = payload.evidence;
        return typeof evidence === "object" && evidence && "filename" in evidence ? String(evidence.filename) : "";
      })
      .filter(Boolean)
  );
  const isTerminalStatus = ["resolved", "closed", "cancelled"].includes(ticket.status);
  const mapHref =
    ticket.charger_context.location_lat != null && ticket.charger_context.location_lng != null
      ? `https://www.google.com/maps?q=${ticket.charger_context.location_lat},${ticket.charger_context.location_lng}`
      : "";
  const chargerIdentity =
    ticket.charger_context.charger_brand_model || ticket.charger_context.charger_serial_number
      ? `${ticket.charger_context.charger_brand_model || "Brand/model not provided"} / ${
          ticket.charger_context.charger_serial_number || "Serial not provided"
        }`
      : "Not provided - request charger label close-up if needed.";
  const shouldShowScheduling =
    !isTerminalStatus &&
    (showScheduling ||
      ticket.recipient_type === "after_sales_team" ||
      ["assigned", "scheduled", "reschedule_requested"].includes(ticket.status) ||
      ["pending", "scheduled", "reschedule_requested"].includes(ticket.schedule_status));
  const timelineItems = ticket.events.map((event) => ({
    title: event.event_type.replaceAll("_", " "),
    body: event.message,
    timestamp: new Date(event.created_at).toLocaleString(),
  }));
  const primaryAction = getPrimaryStaffAction(ticket, shouldShowScheduling);

  const setStatus = async (status: TicketStatus) => {
    if (submittingStatus) return;
    setSubmittingStatus(status);
    try {
      const updated = await updateTicketStatus(ticket.ticket_id, {
        status,
        actor_role: "staff",
        actor_name: "Demo Staff",
        note: `Staff changed status to ${formatTicketStatus(status)}.`,
      });
      setTicket(updated);
    } finally {
      setSubmittingStatus(null);
    }
  };

  const addInternalNote = async () => {
    if (!note.trim() || isAddingNote) return;
    setIsAddingNote(true);
    try {
      await addTicketEvent(ticket.ticket_id, {
        event_type: "staff_note_added",
        actor_role: "staff",
        actor_name: "Demo Staff",
        message: note,
        payload_json: {},
      });
      setNote("");
      refresh();
    } finally {
      setIsAddingNote(false);
    }
  };

  const scheduleVisit = async () => {
    const slot = suggestions?.slots.find((item) => item.scheduled_at === selectedSlot);
    if (!slot || !selectedTechnician || isScheduling) return;
    setIsScheduling(true);
    try {
      const updated = await scheduleTicket(ticket.ticket_id, {
        scheduled_at: slot.scheduled_at,
        scheduled_window: slot.scheduled_window,
        assigned_technician: selectedTechnician,
        actor_name: "Demo Staff",
      });
      setTicket(updated);
      refresh();
    } finally {
      setIsScheduling(false);
    }
  };

  const markWhatsAppSent = async () => {
    if (isMarkingWhatsApp) return;
    setIsMarkingWhatsApp(true);
    try {
      await addTicketEvent(ticket.ticket_id, {
        event_type: "whatsapp_preview_marked_sent",
        actor_role: "staff",
        actor_name: "Demo Staff",
        message: "Staff marked the WhatsApp simulation message as sent.",
        payload_json: { simulation_only: true },
      });
      refresh();
    } finally {
      setIsMarkingWhatsApp(false);
    }
  };

  const runPrimaryAction = () => {
    if (primaryAction.status) {
      setStatus(primaryAction.status);
      return;
    }
    document.getElementById(primaryAction.targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <PageShell maxWidth="7xl" density="detail">
      <CommandHeader
        eyebrow="Staff Ticket Detail"
        title={ticket.ticket_id}
        description={`${formatObservationResult(ticket.observation_result)} / ${formatFaultTypeV2(ticket.fault_type_v2)}. Recommended action: ${getTicketActionNeeded(ticket)}`}
        badges={
          <>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {ticket.charger_context.installed_by === "third_party" && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Warranty review required
              </span>
            )}
          </>
        }
        primaryAction={
          <Button className="rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={runPrimaryAction} disabled={Boolean(submittingStatus)}>
            {submittingStatus === primaryAction.status ? <ButtonLoadingLabel label="Updating..." /> : primaryAction.label}
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/staff/dashboard">Back to queue</Link>
          </Button>
        }
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SupportCard className="border-blue-100 bg-blue-50 p-6">
            <p className="technical-label text-blue-700">Case Snapshot</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Operational state</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoBox label="Proof" value={getProofStatus(ticket)} />
              <InfoBox label="Schedule" value={getScheduleStatus(ticket)} />
              <InfoBox label="Last updated" value={new Date(ticket.updated_at || ticket.created_at).toLocaleString()} />
              <InfoBox label="Owner" value={ticket.assigned_technician || ticket.assigned_team_id || ticket.recipient_type.replaceAll("_", " ")} />
            </div>
          </SupportCard>

          {evidenceUrl && <EvidencePanel imageUrl={evidenceUrl} annotations={annotations} />}

          <SupportCard className="p-6">
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
          </SupportCard>

          <SupportCard className="p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Customer and installation context</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox label="Customer" value={ticket.customer_profile.full_name} />
              <InfoBox label="Contact" value={`${ticket.customer_profile.phone_number} / ${ticket.customer_profile.email}`} />
              <InfoBox label="Address" value={ticket.charger_context.installation_address} />
              <InfoBox label="Home charger location" value={formatHomeChargerLocation(ticket.charger_context.home_charger_location)} />
              {ticket.charger_context.charger_location_notes && (
                <InfoBox label="Location notes" value={ticket.charger_context.charger_location_notes} />
              )}
              <InfoBox label="Location source" value={formatLocationSource(ticket.charger_context.location_source)} />
              <InfoBox
                label="Map coordinate"
                value={
                  mapHref ? (
                    <a href={mapHref} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-4">
                      Open in Google Maps
                    </a>
                  ) : (
                    "Not provided"
                  )
                }
              />
              <InfoBox
                label="Location accuracy"
                value={
                  ticket.charger_context.location_accuracy_m != null
                    ? `${Math.round(ticket.charger_context.location_accuracy_m)} m approximate`
                    : "Not provided"
                }
              />
              <InfoBox label="Installation source" value={formatInstallationSource(ticket.charger_context.installed_by)} />
              <InfoBox label="Charger identity" value={chargerIdentity} />
              <InfoBox label="Customer comments" value={ticket.customer_comments || ticket.charger_context.symptom_text || "None"} />
            </div>
          </SupportCard>

          {(additionalProof.length > 0 || proofEvents.length > 0) && (
            <SupportCard className="p-6">
              <h2 className="mb-1 text-xl font-extrabold text-slate-950">Customer-uploaded proof for staff review</h2>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
                Supplemental proof is attached for staff review and does not imply automatic AI re-analysis.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {additionalProof.map((item, index) => {
                  const url = resolveEvidenceUrl(item);
                  const isLabelPhoto = chargerLabelEvidenceNames.has(item.filename || "");
                  return (
                    <a
                      key={`${item.storage_path || item.filename}-${index}`}
                      href={url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 hover:border-blue-300"
                    >
                      <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                        {isLabelPhoto ? "Charger label photo for brand/model and serial verification" : item.kind || "proof"}
                      </p>
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
            </SupportCard>
          )}

          <SupportCard className="p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-950">Activity timeline</h2>
            <SupportTimeline items={timelineItems} />
          </SupportCard>
        </div>

        <div id="staff-action-panel" className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <ActionPanelCard id="recommended-action" title="Recommended Action" icon={<Wrench className="h-5 w-5 text-green-700" />}>
            <p className="text-sm font-semibold leading-6 text-slate-700">{getTicketActionNeeded(ticket)}</p>
            <Button className="mt-4 w-full rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={runPrimaryAction} disabled={Boolean(submittingStatus)}>
              {submittingStatus === primaryAction.status ? <ButtonLoadingLabel label="Updating..." /> : primaryAction.label}
            </Button>
          </ActionPanelCard>

          <ActionPanelCard id="status-actions" title="Status Actions" icon={<Wrench className="h-5 w-5 text-blue-700" />}>
            <div className="grid gap-2 sm:grid-cols-2">
              {statusActions.map((action) => (
                <Button key={action.status} variant="outline" className="rounded-xl" onClick={() => setStatus(action.status)} disabled={Boolean(submittingStatus)}>
                  {submittingStatus === action.status ? <ButtonLoadingLabel label="Updating..." /> : action.label}
                </Button>
              ))}
            </div>
          </ActionPanelCard>

          {whatsApp ? (
            <ActionPanelCard id="whatsapp-preview" title="WhatsApp preview" icon={<MessageCircle className="h-5 w-5 text-green-700" />}>
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
                <Button className="rounded-xl bg-green-700 font-bold hover:bg-green-800" onClick={markWhatsAppSent} disabled={isMarkingWhatsApp}>
                  {isMarkingWhatsApp ? <ButtonLoadingLabel label="Saving..." /> : "Mark Sent"}
                </Button>
              </div>
            </ActionPanelCard>
          ) : isLoadingAuxiliary ? (
            <ActionPanelCard id="whatsapp-preview" title="WhatsApp preview" icon={<MessageCircle className="h-5 w-5 text-green-700" />}>
              <LoadingSpinner label="Preparing WhatsApp preview..." />
            </ActionPanelCard>
          ) : null}

          {isTerminalStatus && ticket.scheduled_at ? (
            <ActionPanelCard id="scheduling" title="Previous scheduled visit" icon={<CalendarClock className="h-5 w-5 text-slate-500" />}>
              <p className="text-sm font-semibold text-slate-700">{new Date(ticket.scheduled_at).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{ticket.scheduled_window}</p>
              {ticket.assigned_technician && (
                <p className="mt-1 text-sm font-semibold text-slate-700">Technician: {ticket.assigned_technician}</p>
              )}
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                This ticket is {formatTicketStatus(ticket.status).toLowerCase()}; scheduling controls are locked.
              </p>
            </ActionPanelCard>
          ) : shouldShowScheduling ? (
            <ActionPanelCard id="scheduling" title="Assisted scheduling" icon={<CalendarClock className="h-5 w-5 text-blue-700" />}>
              <div className="space-y-4">
                {isLoadingAuxiliary && <LoadingSpinner label="Loading schedule suggestions..." />}
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
                <Button className="w-full rounded-xl bg-blue-700 font-bold hover:bg-blue-800" onClick={scheduleVisit} disabled={isScheduling || !selectedSlot || !selectedTechnician}>
                  {isScheduling ? <ButtonLoadingLabel label="Scheduling..." /> : "Schedule Visit"}
                </Button>
              </div>
            </ActionPanelCard>
          ) : (
            <ActionPanelCard id="scheduling" title="Scheduling not required yet" icon={<CalendarClock className="h-5 w-5 text-slate-500" />}>
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Open scheduling manually only if staff decides a technician visit is needed.
              </p>
              <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => setShowScheduling(true)}>
                Open Scheduling
              </Button>
            </ActionPanelCard>
          )}

          <ActionPanelCard id="internal-note" title="Internal Note">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Not visible to customer.</p>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-[100px] resize-none rounded-xl" />
            <Button className="mt-3 w-full rounded-xl bg-blue-700 font-bold hover:bg-blue-800" onClick={addInternalNote} disabled={!note.trim() || isAddingNote}>
              {isAddingNote ? <ButtonLoadingLabel label="Adding note..." /> : "Add Internal Note"}
            </Button>
          </ActionPanelCard>

          {ticket.feedback.length > 0 && (
            <ActionPanelCard title="Customer feedback">
              <h2 className="text-xl font-extrabold text-slate-950">Customer feedback</h2>
              {ticket.feedback.map((item) => (
                <div key={item.id} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  <p>Resolved: {item.issue_resolved}</p>
                  <p>Support rating: {item.support_rating}/5</p>
                  <p>AI helpful: {item.ai_guidance_helpful}</p>
                  {item.comment && <p className="mt-2">{item.comment}</p>}
                </div>
              ))}
            </ActionPanelCard>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function getPrimaryStaffAction(ticket: TicketRecord, shouldShowScheduling: boolean): { label: string; status?: TicketStatus; targetId: string } {
  if (ticket.status === "waiting_customer") return { label: "Request More Proof", targetId: "recommended-action" };
  if (shouldShowScheduling && !ticket.scheduled_at) return { label: "Schedule Visit", targetId: "scheduling" };
  if (ticket.status === "assigned") return { label: "Mark In Progress", status: "in_progress", targetId: "status-actions" };
  if (ticket.status === "in_progress") return { label: "Mark Resolved", status: "resolved", targetId: "status-actions" };
  if (ticket.status === "resolved") return { label: "Close Ticket", status: "closed", targetId: "status-actions" };
  return { label: "Review Actions", targetId: "recommended-action" };
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
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
