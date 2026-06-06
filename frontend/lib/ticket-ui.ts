import type { TicketPriority, TicketStatus } from "./api";

export function formatTicketStatus(status?: TicketStatus | string | null) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "triaged":
      return "Under Review";
    case "waiting_customer":
      return "More Info Needed";
    case "assigned":
      return "After-sales Review";
    case "scheduled":
      return "Visit Scheduled";
    case "reschedule_requested":
      return "Reschedule Requested";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
    case "reopened":
      return "Reopened";
    default:
      return "Unknown";
  }
}

export function priorityClass(priority?: TicketPriority | string | null) {
  switch (priority) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "High":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function statusClass(status?: TicketStatus | string | null) {
  switch (status) {
    case "waiting_customer":
    case "reschedule_requested":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "assigned":
    case "scheduled":
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "resolved":
    case "closed":
      return "border-green-200 bg-green-50 text-green-800";
    case "reopened":
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function nextActionForTicket(status: TicketStatus, requiredProof?: string | null) {
  if (status === "waiting_customer") return requiredProof || "Upload the requested proof so support can continue.";
  if (status === "assigned") return "After-sales is reviewing this case and preparing the next action.";
  if (status === "scheduled") return "Please keep the charger and EVDB area accessible for the scheduled visit.";
  if (status === "resolved") return "Confirm whether the issue is resolved by submitting feedback.";
  if (status === "closed") return "This ticket is closed.";
  if (status === "reopened") return "After-sales will review your feedback and follow up.";
  return "Follow the ChargerDoc guidance and check this page for updates.";
}
