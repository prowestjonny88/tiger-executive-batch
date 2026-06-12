"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Hourglass, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import {
  fetchTickets,
  formatFaultTypeV2,
  formatInputComponent,
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
import { getPriorityMeta, type TicketTone } from "../../../lib/ticket-ui";
import { PageShell } from "../../../components/layout/page-shell";
import { Button } from "../../../components/ui/button";
import { EmptyState, KpiCard, PriorityBadge, StatusBadge, SupportCard } from "../../../components/support";

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
        label: "Waiting Customer",
        count: allTickets.filter((ticket) => ticket.status === "waiting_customer").length,
        helper: "Proof or clarification needed",
        tone: "amber" as TicketTone,
        icon: <Hourglass className="h-4 w-4" />,
        onClick: () => setActiveTab("waiting_customer"),
      },
      {
        label: "High Priority",
        count: allTickets.filter((ticket) => ticket.priority === "High").length,
        helper: "High-risk cases to review first",
        tone: "red" as TicketTone,
        icon: <AlertTriangle className="h-4 w-4" />,
        onClick: () => {
          setActiveTab("all");
          setFilters((current) => ({ ...current, priority: current.priority === "High" ? "" : "High" }));
        },
      },
      {
        label: "To Schedule",
        count: allTickets.filter(isToScheduleTicket).length,
        helper: "After-sales tickets without a slot",
        tone: "blue" as TicketTone,
        icon: <CalendarClock className="h-4 w-4" />,
        onClick: () => setActiveTab("to_schedule"),
      },
      {
        label: "Reopened",
        count: allTickets.filter((ticket) => ticket.status === "reopened").length,
        helper: "Returned after customer feedback",
        tone: "red" as TicketTone,
        icon: <RotateCcw className="h-4 w-4" />,
        onClick: () => setActiveTab("reopened"),
      },
    ],
    [allTickets]
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

  const hasSearchOrFilters = search.trim().length > 0 || Object.values(filters).some(Boolean);
  const emptyState = getEmptyStateCopy(activeTab, allTickets.length > 0, hasSearchOrFilters);

  return (
    <PageShell maxWidth="7xl" density="dashboard">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-blue-700">After-sales Staff</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">After-sales Queue</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Scan proof requests, high-priority cases, and scheduling work without opening every ticket.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/login">Switch Role</Link>
        </Button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.count}
            helper={card.helper}
            tone={card.tone}
            icon={card.icon}
            active={
              (card.label === "Waiting Customer" && activeTab === "waiting_customer") ||
              (card.label === "To Schedule" && activeTab === "to_schedule") ||
              (card.label === "Reopened" && activeTab === "reopened") ||
              (card.label === "High Priority" && filters.priority === "High")
            }
            onClick={card.onClick}
          />
        ))}
      </div>

      <SupportCard className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ticket, customer, contact, issue..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              aria-label="Search tickets"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <QuickFilterButton active={filters.priority === "High"} onClick={() => {
              setActiveTab("all");
              setFilters((current) => ({ ...current, priority: current.priority === "High" ? "" : "High" }));
            }}>
              High Priority
            </QuickFilterButton>
            <QuickFilterButton active={activeTab === "waiting_customer"} onClick={() => setActiveTab("waiting_customer")}>
              Waiting Proof
            </QuickFilterButton>
            <QuickFilterButton active={activeTab === "to_schedule"} onClick={() => setActiveTab("to_schedule")}>
              To Schedule
            </QuickFilterButton>
            <QuickFilterButton active={activeTab === "reopened"} onClick={() => setActiveTab("reopened")}>
              Reopened
            </QuickFilterButton>
            {hasSearchOrFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilters({});
                }}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-extrabold text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Advanced filters
          </summary>
          <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-3 xl:grid-cols-4">
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
        </details>
      </SupportCard>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
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

      <div className="space-y-3">
        {visibleTickets.length === 0 ? (
          <EmptyState title={emptyState.title} body={emptyState.body} />
        ) : (
          visibleTickets.map((ticket) => (
            <TicketQueueCard key={ticket.ticket_id} ticket={ticket} />
          ))
        )}
      </div>
    </PageShell>
  );
}

function QuickFilterButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-extrabold transition ${
        active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function TicketQueueCard({ ticket }: { ticket: TicketRecord }) {
  const priorityTone = getPriorityMeta(ticket.priority).tone;
  const tone = ticket.status === "waiting_customer" ? "amber" : priorityTone;
  const locationSummary = getLocationSummary(ticket);

  return (
    <SupportCard className="overflow-hidden transition hover:border-blue-300 hover:shadow-md">
      <div className="grid gap-0 lg:grid-cols-[6px_1.35fr_1fr_auto]">
        <div className={`hidden lg:block ${queueRailClass(tone)}`} />
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-slate-950">{ticket.ticket_id}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-slate-950">{ticket.customer_profile.full_name || "Unknown customer"}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {formatInputComponent(ticket.input_component)} / {formatObservationResult(ticket.observation_result)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">{locationSummary}</p>
        </div>

        <div className="grid gap-2 border-t border-slate-100 p-4 text-sm font-semibold text-slate-600 lg:border-l lg:border-t-0">
          <DashboardField label="Issue" value={formatFaultTypeV2(ticket.fault_type_v2)} />
          <DashboardField label="Action Needed" value={getTicketActionNeeded(ticket)} strong />
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-800">
              Proof Status: {getProofStatus(ticket)}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
              Schedule Status: {getScheduleStatus(ticket)}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 p-4 lg:min-w-64 lg:border-l lg:border-t-0">
          <div className="text-sm font-semibold leading-6 text-slate-600">
            <p className="technical-label text-slate-500">Assigned Team</p>
            <p className="font-extrabold text-slate-950">{ticket.assigned_team_id || ticket.recipient_type.replaceAll("_", " ")}</p>
            <p className="mt-2 technical-label text-slate-500">Last Updated</p>
            <p className="font-bold text-slate-700">{new Date(ticket.updated_at || ticket.created_at).toLocaleString()}</p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href={`/staff/tickets/${ticket.ticket_id}`}>Open Ticket</Link>
          </Button>
        </div>
      </div>
    </SupportCard>
  );
}

function DashboardField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="technical-label text-slate-500">{label}</p>
      <p className={strong ? "font-extrabold text-slate-950" : "font-semibold text-slate-700"}>{value}</p>
    </div>
  );
}

function getLocationSummary(ticket: TicketRecord) {
  if (ticket.charger_context.location_lat && ticket.charger_context.location_lng) {
    return "Address available in ticket detail / GPS captured";
  }
  return "Address available in ticket detail";
}

function queueRailClass(tone: TicketTone) {
  switch (tone) {
    case "red":
      return "bg-red-500";
    case "amber":
      return "bg-amber-400";
    case "green":
      return "bg-emerald-500";
    case "blue":
      return "bg-blue-500";
    default:
      return "bg-slate-300";
  }
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
