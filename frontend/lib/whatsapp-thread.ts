import type { TicketEvent, TicketRecord } from "./api";
import { formatTicketStatus } from "./ticket-ui";

export type WhatsAppThreadBubble = {
  id: string;
  message: string;
  created_at: string;
  align: "left" | "right";
};

export const hiddenCustomerEventTypes = new Set([
  "staff_note_added",
  "whatsapp_preview_marked_sent",
  "internal_status_note",
  "internal_assignment_note",
]);

function eventMessage(ticket: TicketRecord, event: TicketEvent) {
  if (event.event_type === "ticket_created") {
    return `Your ChargerDoc ticket ${ticket.ticket_id} has been created.`;
  }
  if (event.event_type === "triage_completed") {
    return `Photo check completed. Detected issue: ${ticket.observation_result.replaceAll("_", " ")}.`;
  }
  if (event.event_type === "proof_requested") {
    return `More proof is needed: ${ticket.required_proof_next || event.message}`;
  }
  if (event.event_type === "proof_uploaded") {
    return "Additional proof was uploaded and added to the ticket.";
  }
  if (event.event_type === "status_changed") {
    const status = event.payload_json?.status || event.payload_json?.new_status;
    return status
      ? `Your ticket status is now: ${formatTicketStatus(String(status))}.`
      : "Your ticket status was updated by the support team.";
  }
  if (event.event_type === "visit_scheduled") {
    return event.message;
  }
  if (event.event_type === "feedback_submitted") {
    return "Feedback received. Thank you.";
  }
  return event.message;
}

export function buildWhatsAppThread(ticket: TicketRecord): WhatsAppThreadBubble[] {
  return ticket.events
    .filter((event) => !hiddenCustomerEventTypes.has(event.event_type))
    .map((event) => ({
      id: String(event.id),
      message: eventMessage(ticket, event),
      created_at: event.created_at,
      align: event.actor_role === "customer" ? "right" : "left",
    }));
}
