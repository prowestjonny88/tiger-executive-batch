import type { TicketRecord } from "./api";

const terminalStatuses = new Set(["closed", "cancelled"]);
const resolvedStatuses = new Set(["resolved", "closed"]);

export function getTicketActionNeeded(ticket: TicketRecord) {
  if (ticket.status === "waiting_customer") return "Waiting for customer proof";
  if (ticket.status === "reopened") {
    return ticket.feedback.length > 0 ? "Review negative feedback" : "Review reopened ticket";
  }
  if (ticket.status === "resolved") return "Awaiting customer feedback or closure";
  if (terminalStatuses.has(ticket.status)) return "No action needed";
  if (ticket.scheduled_at && ticket.status === "scheduled") return "Prepare for scheduled visit";
  if (ticket.status === "reschedule_requested") return "Review reschedule request";
  if (ticket.status === "in_progress") return "Complete service and resolve";
  if (ticket.required_proof_next) return "Request customer proof";
  if (ticket.recipient_type === "after_sales_team" && !ticket.scheduled_at) return "Schedule technician or review remotely";
  return "Review AI triage";
}

export function getProofStatus(ticket: TicketRecord) {
  if (ticket.status === "waiting_customer" && ticket.required_proof_next) return "Proof needed";
  if (ticket.events.some((event) => event.event_type === "proof_uploaded")) return "Proof uploaded";
  if (ticket.required_proof_next) return "Proof requested";
  return "No proof needed";
}

export function getScheduleStatus(ticket: TicketRecord) {
  if (ticket.status === "reschedule_requested" || ticket.schedule_status === "reschedule_requested") return "Reschedule requested";
  if (ticket.scheduled_at && resolvedStatuses.has(ticket.status)) return "Previous visit";
  if (ticket.scheduled_at || ticket.schedule_status === "scheduled") return "Scheduled";
  if (ticket.recipient_type === "after_sales_team" && !terminalStatuses.has(ticket.status)) return "Not scheduled";
  return "Not required";
}

export function isNeedsReviewTicket(ticket: TicketRecord) {
  return ["submitted", "triaged", "assigned"].includes(ticket.status) && !ticket.scheduled_at;
}

export function isToScheduleTicket(ticket: TicketRecord) {
  return (
    ticket.recipient_type === "after_sales_team" &&
    !ticket.scheduled_at &&
    !["resolved", "closed", "cancelled", "waiting_customer"].includes(ticket.status)
  );
}

export function isScheduledActiveTicket(ticket: TicketRecord) {
  return Boolean(ticket.scheduled_at) && !["resolved", "closed", "cancelled"].includes(ticket.status);
}
