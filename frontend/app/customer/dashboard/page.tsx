"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle, PlusCircle } from "lucide-react";

import {
  fetchTickets,
  type TicketRecord,
  type CustomerProfile,
} from "../../../lib/api";
import { loadDemoCustomerProfile, useDemoRoleGuard } from "../../../lib/demo-role";
import { PageShell } from "../../../components/layout/page-shell";
import { Button } from "../../../components/ui/button";
import { EmptyState, SectionHeader, SupportCard, TicketListSkeleton, TicketSummaryCard } from "../../../components/support";

export default function CustomerDashboardPage() {
  useDemoRoleGuard("customer");
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [error, setError] = useState("");
  const [hasProfile, setHasProfile] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    const profile = loadDemoCustomerProfile<CustomerProfile>();
    if (!profile?.email) {
      setHasProfile(false);
      setTickets([]);
      setIsLoadingTickets(false);
      return;
    }
    setHasProfile(true);
    setIsLoadingTickets(true);
    fetchTickets({ customer_email: profile.email })
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tickets."))
      .finally(() => setIsLoadingTickets(false));
  }, []);

  return (
    <PageShell maxWidth="6xl" density="detail">
      <SectionHeader
        eyebrow="Customer Dashboard"
        title="Your Charger Support Tickets"
        description="Track diagnosis, proof requests, appointments, and after-sales updates in one place."
        action={
          <Button asChild className="rounded-xl bg-green-700 font-bold hover:bg-green-800">
            <Link href="/customer/new-ticket">
              <PlusCircle className="mr-2 h-4 w-4" />
              Report New Issue
            </Link>
          </Button>
        }
        className="mb-8"
      />

      {tickets.length > 0 && (
        <SupportCard className="mb-6 grid gap-4 bg-green-50 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="technical-label text-green-700">Active Support</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">{tickets.length} ticket{tickets.length === 1 ? "" : "s"} on record</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Open a ticket to see the current step, next action, proof request, WhatsApp-style updates, and visit details.
            </p>
          </div>
          <Link href="/customer/new-ticket">
            <Button className="rounded-xl bg-green-700 font-bold hover:bg-green-800">Report Another Issue</Button>
          </Link>
        </SupportCard>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4">
        {isLoadingTickets ? (
          <TicketListSkeleton count={2} />
        ) : !hasProfile ? (
          <EmptyState
            title="No customer profile found"
            body="Start your first support ticket so this demo dashboard can show only your tickets."
            action={
              <Button asChild className="rounded-xl bg-green-700 font-bold hover:bg-green-800">
                <Link href="/customer/new-ticket">Start your first support ticket</Link>
              </Button>
            }
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No support tickets yet"
            body="When you report a charger issue, your diagnosis, ticket status, and after-sales updates will appear here."
            action={
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild className="rounded-xl bg-green-700 font-bold hover:bg-green-800">
                  <Link href="/customer/new-ticket">Report Charger Issue</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/safety">Learn what photos to upload</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <>
            {tickets.map((ticket) => (
              <TicketSummaryCard
                key={ticket.ticket_id}
                ticket={ticket}
                href={`/customer/tickets/${ticket.ticket_id}`}
                proofAction={ticket.status === "waiting_customer"}
              />
            ))}
            <div className="grid gap-4 md:grid-cols-2">
              <SupportCard className="p-5">
                <p className="technical-label text-slate-500">Recent Updates</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-950">Latest activity stays inside each ticket</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Open a ticket to view proof requests, status changes, scheduled visits, and WhatsApp-style updates.
                </p>
              </SupportCard>
              <SupportCard className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-green-700" />
                  <h2 className="text-xl font-extrabold text-slate-950">Need help?</h2>
                </div>
                <p className="text-sm font-semibold leading-6 text-slate-600">
                  If your charger status changes, upload clearer proof from the ticket page or start a new check.
                </p>
              </SupportCard>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
