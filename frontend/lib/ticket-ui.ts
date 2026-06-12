import type { TicketPriority, TicketStatus } from "./api";

export type TicketTone = "blue" | "amber" | "green" | "red" | "slate";

export interface TicketUiMeta {
  label: string;
  tone: TicketTone;
  icon: string;
}

export const statusMeta: Record<TicketStatus, TicketUiMeta> = {
  submitted: { label: "Submitted", tone: "blue", icon: "file-text" },
  triaged: { label: "Needs Review", tone: "blue", icon: "eye" },
  waiting_customer: { label: "More Info Needed", tone: "amber", icon: "hourglass" },
  assigned: { label: "After-sales Review", tone: "blue", icon: "headphones" },
  scheduled: { label: "Visit Scheduled", tone: "green", icon: "calendar-check" },
  reschedule_requested: { label: "Reschedule Requested", tone: "amber", icon: "calendar-clock" },
  in_progress: { label: "In Progress", tone: "blue", icon: "wrench" },
  resolved: { label: "Resolved", tone: "green", icon: "check-circle" },
  closed: { label: "Closed", tone: "slate", icon: "lock" },
  cancelled: { label: "Cancelled", tone: "red", icon: "x-circle" },
  reopened: { label: "Reopened", tone: "red", icon: "rotate-ccw" },
};

export const priorityMeta: Record<TicketPriority, TicketUiMeta> = {
  Critical: { label: "Critical", tone: "red", icon: "siren" },
  High: { label: "High", tone: "red", icon: "flame" },
  Medium: { label: "Medium", tone: "amber", icon: "circle-alert" },
  Low: { label: "Low", tone: "green", icon: "circle" },
};

export function toneClass(tone?: TicketTone | null) {
  switch (tone) {
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "red":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function getStatusMeta(status?: TicketStatus | string | null): TicketUiMeta {
  return statusMeta[status as TicketStatus] ?? { label: "Unknown", tone: "slate", icon: "circle-help" };
}

export function getPriorityMeta(priority?: TicketPriority | string | null): TicketUiMeta {
  return priorityMeta[priority as TicketPriority] ?? { label: "Low", tone: "slate", icon: "circle" };
}

export function formatTicketStatus(status?: TicketStatus | string | null) {
  return getStatusMeta(status).label;
}

export function priorityClass(priority?: TicketPriority | string | null) {
  return toneClass(getPriorityMeta(priority).tone);
}

export function statusClass(status?: TicketStatus | string | null) {
  return toneClass(getStatusMeta(status).tone);
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
