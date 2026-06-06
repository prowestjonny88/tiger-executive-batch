"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Headphones } from "lucide-react";

import {
  fetchTickets,
  formatFaultTypeV2,
  formatInputComponent,
  formatInstallationSource,
  formatObservationResult,
  type TicketRecord,
} from "../../../lib/api";
import { useDemoRoleGuard } from "../../../lib/demo-role";
import {
  getProofStatus,
  getScheduleStatus,
  getTicketActionNeeded,
  isNeedsReviewTicket,
  isScheduledActiveTicket,
  isToScheduleTicket,
} from "../../../lib/ticket-actions";
import { formatTicketStatus, priorityClass, statusClass } from "../../../lib/ticket-ui";
import { PageShell } from "../../../components/layout/page-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

const filterOptions = {
  priority: ["", "Critical", "High", "Medium", "Low"],
  status: ["", "waiting_customer", "assigned", "scheduled", "in_progress", "resolved", "closed", "reopened"],
  fault_type: ["", "protection_issue", "charger_issue", "supply_issue", "installation_issue", "manual_error", "power_cut", "identification_only", "unknown"],
  component: ["", "charger", "evdb", "isolator", "unknown"],
  recipient_type: ["", "customer", "after_sales_team", "none", "unknown"],
  installation_source: ["", "rexharge", "third_party", "property_management", "unknown"],
  assigned_technician: ["", "Ahmad", "Mei Ling"],
  customer_type: ["", "home", "condo", "commercial", "public_site", "unknown"],
};

type WorkflowTab = "needs_review" | "waiting_customer" | "to_schedule" | "scheduled" | "resolved" | "reopened" | "all";

const workflowTabs: Array<{ id: WorkflowTab; label: string }> = [
  { id: "needs_review", label: "Needs Review" },
  { id: "waiting_customer", label: "Waiting Customer" },
  { id: "to_schedule", label: "To Schedule" },
  { id: "scheduled", label: "Scheduled" },
  { id: "resolved", label: "Resolved" },
  { id: "reopened", label: "Reopened" },
  { id: "all", label: "All Tickets" },
];

export default function StaffDashboardPage() {
  useDemoRoleGuard("staff");
  const [allTickets, setAllTickets] = useState<TicketRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<WorkflowTab>("needs_review");
  const [error, setError] = useState("");

  const loadAllTickets = () => {
    fetchTickets({})
      .then((data) => setAllTickets(data.tickets))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets."));
  };

  const loadFilteredTickets = () => {
    fetchTickets(filters)
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets."));
  };

  useEffect(loadAllTickets, []);
  useEffect(loadFilteredTickets, [filters]);
  const summaryCards = useMemo(
    () => [
      {
        label: "Needs Review",
        count: allTickets.filter(isNeedsReviewTicket).length,
        helper: "New or assigned tickets requiring staff attention",
        onClick: () => setActiveTab("needs_review"),
      },
      {
        label: "Waiting Customer",
        count: allTickets.filter((ticket) => ticket.status === "waiting_customer").length,
        helper: "Tickets waiting for customer proof or clarification",
        onClick: () => setActiveTab("waiting_customer"),
      },
      {
        label: "High Priority",
        count: allTickets.filter((ticket) => ticket.priority === "High").length,
        helper: "High priority cases to review first",
        onClick: () => setFilters({ ...filters, priority: filters.priority === "High" ? "" : "High" }),
      },
      {
        label: "To Schedule",
        count: allTickets.filter(isToScheduleTicket).length,
        helper: "After-sales tickets without a visit slot",
        onClick: () => setActiveTab("to_schedule"),
      },
      {
        label: "Scheduled Today",
        count: allTickets.filter(isScheduledToday).length,
        helper: "Visits scheduled for today",
        onClick: () => setActiveTab("scheduled"),
      },
      {
        label: "Reopened",
        count: allTickets.filter((ticket) => ticket.status === "reopened").length,
        helper: "Tickets returned for review after feedback",
        onClick: () => setActiveTab("reopened"),
      },
    ],
    [allTickets, filters]
  );

  const tabbedTickets = useMemo(
    () => tickets.filter((ticket) => matchesWorkflowTab(ticket, activeTab)),
    [activeTab, tickets]
  );

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tabbedTickets;
    return tabbedTickets.filter((ticket) => {
      const searchable = [
        ticket.ticket_id,
        ticket.customer_profile.full_name,
        ticket.customer_profile.phone_number,
        ticket.customer_profile.whatsapp_number,
        ticket.customer_profile.email,
        ticket.charger_context.installation_address,
        ticket.input_component,
        ticket.observation_result,
        ticket.fault_type_v2,
        ticket.assigned_technician,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [search, tabbedTickets]);
  const emptyState = getEmptyStateCopy(activeTab, allTickets.length > 0, search.trim().length > 0 || Object.values(filters).some(Boolean));

  return (
    <PageShell maxWidth="6xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-blue-700">After-sales Staff</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Ticket priority queue</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">Filter operational tickets by priority, status, component, and installation source.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/login">Switch Role</Link>
        </Button>
      </div>

      <Card className="app-card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-500">Filters</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket, customer, phone, address..."
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 md:col-span-2"
            aria-label="Search tickets"
          />
          {Object.entries(filterOptions).map(([key, options]) => (
            <select
              key={key}
              value={filters[key] || ""}
              onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              {options.map((option) => (
                <option key={option || "all"} value={option}>
                  {option ? option.replaceAll("_", " ") : `All ${key.replace("_", " ")}`}
                </option>
              ))}
            </select>
          ))}
          <input
            type="date"
            value={filters.date_submitted || ""}
            onChange={(event) => setFilters({ ...filters, date_submitted: event.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            aria-label="Date submitted"
          />
        </div>
      </Card>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <p className="technical-label text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-950">{card.count}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{card.helper}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {workflowTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-extrabold transition ${
              activeTab === tab.id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleTickets.length === 0 ? (
          <Card className="app-card p-8 text-center">
            <Headphones className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-extrabold text-slate-950">{emptyState.title}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{emptyState.body}</p>
          </Card>
        ) : (
          visibleTickets.map((ticket) => (
            <Link
              href={`/staff/tickets/${ticket.ticket_id}`}
              key={ticket.ticket_id}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.7fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-mono text-sm font-extrabold text-slate-950">{ticket.ticket_id}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>{formatTicketStatus(ticket.status)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold text-slate-950">{ticket.customer_profile.full_name || "Unknown customer"}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{ticket.charger_context.installation_address}</p>
                  <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-950">
                    Action Needed: {getTicketActionNeeded(ticket)}
                  </p>
                </div>
                <div className="text-sm font-semibold leading-6 text-slate-600">
                  <p>{formatInputComponent(ticket.input_component)} / {formatObservationResult(ticket.observation_result)}</p>
                  <p>{formatFaultTypeV2(ticket.fault_type_v2)}</p>
                  <p>Installation: {formatInstallationSource(ticket.charger_context.installed_by)}</p>
                  <p>Proof Status: {getProofStatus(ticket)}</p>
                </div>
                <div className="text-sm font-semibold leading-6 text-slate-600">
                  <p>{ticket.assigned_team_id || ticket.recipient_type.replaceAll("_", " ")}</p>
                  <p>{ticket.assigned_technician || "No technician assigned"}</p>
                  <p>Schedule Status: {getScheduleStatus(ticket)}</p>
                  <p>Last Updated: {new Date(ticket.updated_at || ticket.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}

function matchesWorkflowTab(ticket: TicketRecord, tab: WorkflowTab) {
  switch (tab) {
    case "needs_review":
      return isNeedsReviewTicket(ticket);
    case "waiting_customer":
      return ticket.status === "waiting_customer";
    case "to_schedule":
      return isToScheduleTicket(ticket);
    case "scheduled":
      return isScheduledActiveTicket(ticket);
    case "resolved":
      return ticket.status === "resolved" || ticket.status === "closed";
    case "reopened":
      return ticket.status === "reopened";
    default:
      return true;
  }
}

function isScheduledToday(ticket: TicketRecord) {
  if (!ticket.scheduled_at) return false;
  const scheduled = new Date(ticket.scheduled_at);
  const today = new Date();
  return scheduled.toDateString() === today.toDateString();
}

function getEmptyStateCopy(activeTab: WorkflowTab, hasAnyTickets: boolean, hasSearchOrFilters: boolean) {
  if (!hasAnyTickets) {
    return {
      title: "No tickets yet",
      body: "New customer support tickets will appear here once submitted.",
    };
  }

  if (hasSearchOrFilters) {
    return {
      title: "No tickets match these filters",
      body: "Try clearing search or filters.",
    };
  }

  switch (activeTab) {
    case "needs_review":
      return {
        title: "No tickets need review right now",
        body: "Try Waiting Customer, To Schedule, Scheduled, or All Tickets.",
      };
    case "waiting_customer":
      return {
        title: "No tickets are waiting for customers",
        body: "Proof-request tickets will appear here.",
      };
    case "to_schedule":
      return {
        title: "No tickets need scheduling",
        body: "After-sales tickets without visit slots will appear here.",
      };
    case "scheduled":
      return {
        title: "No active scheduled visits",
        body: "Scheduled tickets will appear here.",
      };
    case "resolved":
      return {
        title: "No resolved tickets in this view",
        body: "Resolved and closed cases will appear here.",
      };
    case "reopened":
      return {
        title: "No reopened tickets",
        body: "Tickets reopened after feedback will appear here.",
      };
    default:
      return {
        title: "No tickets match these filters",
        body: "Try clearing search or filters.",
      };
  }
}
