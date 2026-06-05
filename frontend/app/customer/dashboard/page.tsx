"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Ticket } from "lucide-react";

import {
  fetchTickets,
  formatFaultTypeV2,
  formatObservationResult,
  type TicketRecord,
  type CustomerProfile,
} from "../../../lib/api";
import { loadDemoCustomerProfile, useDemoRoleGuard } from "../../../lib/demo-role";
import { formatTicketStatus, nextActionForTicket, statusClass } from "../../../lib/ticket-ui";
import { PageShell } from "../../../components/layout/page-shell";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

export default function CustomerDashboardPage() {
  useDemoRoleGuard("customer");
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [error, setError] = useState("");
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    const profile = loadDemoCustomerProfile<CustomerProfile>();
    if (!profile?.email) {
      setHasProfile(false);
      setTickets([]);
      return;
    }
    setHasProfile(true);
    fetchTickets({ customer_email: profile.email })
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets."));
  }, []);

  return (
    <PageShell maxWidth="5xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="technical-label text-green-700">Customer Dashboard</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Your support tickets</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Track ChargerDoc ticket status, required proof, appointments, and feedback.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-green-700 font-bold hover:bg-green-800">
          <Link href="/customer/new-ticket">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4">
        {!hasProfile ? (
          <Card className="app-card p-8 text-center">
            <Ticket className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-extrabold text-slate-950">No customer profile found</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Start a new support ticket so this demo dashboard can show only your tickets.
            </p>
          </Card>
        ) : tickets.length === 0 ? (
          <Card className="app-card p-8 text-center">
            <Ticket className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h2 className="text-xl font-extrabold text-slate-950">No tickets yet</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Start a new support ticket to create your first case.</p>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Link
              key={ticket.ticket_id}
              href={`/customer/tickets/${ticket.ticket_id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-slate-950">{ticket.ticket_id}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>
                      {formatTicketStatus(ticket.status)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold text-slate-950">
                    {formatObservationResult(ticket.observation_result)}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{formatFaultTypeV2(ticket.fault_type_v2)}</p>
                </div>
                <div className="max-w-md text-sm font-medium leading-6 text-slate-600">
                  {nextActionForTicket(ticket.status, ticket.required_proof_next)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
