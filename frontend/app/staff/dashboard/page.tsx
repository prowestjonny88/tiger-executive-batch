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

export default function StaffDashboardPage() {
  useDemoRoleGuard("staff");
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadTickets = () => {
    fetchTickets(filters)
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets."));
  };

  useEffect(loadTickets, [filters]);
  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((ticket) => {
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
  }, [search, tickets]);

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

      <div className="space-y-4">
        {visibleTickets.length === 0 ? (
          <Card className="app-card p-8 text-center">
            <Headphones className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-extrabold text-slate-950">No tickets match these filters</h2>
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
                </div>
                <div className="text-sm font-semibold leading-6 text-slate-600">
                  <p>{formatInputComponent(ticket.input_component)} / {formatObservationResult(ticket.observation_result)}</p>
                  <p>{formatFaultTypeV2(ticket.fault_type_v2)}</p>
                  <p>Installation: {formatInstallationSource(ticket.charger_context.installed_by)}</p>
                </div>
                <div className="text-sm font-semibold leading-6 text-slate-600">
                  <p>{ticket.assigned_team_id || ticket.recipient_type.replaceAll("_", " ")}</p>
                  <p>{ticket.assigned_technician || "No technician assigned"}</p>
                  <p>{new Date(ticket.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
