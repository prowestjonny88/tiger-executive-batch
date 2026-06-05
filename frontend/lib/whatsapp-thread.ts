import type { TicketEvent, TicketRecord } from "./api";

export type WhatsAppThreadBubble = {
  id: string;
  message: string;
  created_at: string;
  align: "left" | "right";
};

const hiddenEventTypes = new Set(["staff_note_added"]);

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
    return "Ticket status was updated by the support team.";
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
    .filter((event) => !hiddenEventTypes.has(event.event_type))
    .map((event) => ({
      id: String(event.id),
      message: eventMessage(ticket, event),
      created_at: event.created_at,
      align: event.actor_role === "customer" ? "right" : "left",
    }));
}
