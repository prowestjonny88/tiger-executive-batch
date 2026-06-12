import Link from "next/link";
import type { TicketRecord } from "../../lib/api";
import { formatFaultTypeV2, formatObservationResult } from "../../lib/api";
import { nextActionForTicket } from "../../lib/ticket-ui";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { SupportCard } from "./support-card";

interface TicketSummaryCardProps {
  ticket: TicketRecord;
  href: string;
  actionLabel?: string;
  proofAction?: boolean;
}

export function TicketSummaryCard({ ticket, href, actionLabel = "View Ticket", proofAction = false }: TicketSummaryCardProps) {
  return (
    <SupportCard className="p-5 transition hover:border-green-300 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-slate-950">{ticket.ticket_id}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="mt-3 technical-label text-green-700">Active Ticket</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">{formatObservationResult(ticket.observation_result)}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{formatFaultTypeV2(ticket.fault_type_v2)}</p>
        </div>
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
          <p className="technical-label text-slate-500">Next Action</p>
          <p className="mt-1 font-extrabold text-slate-950">{nextActionForTicket(ticket.status, ticket.required_proof_next)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={href} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-green-800">
              {actionLabel}
            </Link>
            {proofAction && (
              <Link href={`${href}#proof-upload`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-800">
                Upload More Proof
              </Link>
            )}
          </div>
        </div>
      </div>
    </SupportCard>
  );
}
