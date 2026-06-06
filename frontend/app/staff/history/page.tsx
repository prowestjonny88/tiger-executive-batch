"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Database, Search } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  fetchIncidents,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  type IncidentHistoryItem,
} from "../../../lib/api";
import { useDemoRoleGuard } from "../../../lib/demo-role";
import { PageShell } from "../../../components/layout/page-shell";
import { IncidentStatusBadge } from "../../../components/triage/incident-status-badge";

export default function StaffIncidentAuditHistoryPage() {
  useDemoRoleGuard("staff");
  const [incidents, setIncidents] = useState<IncidentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");

  useEffect(() => {
    fetchIncidents()
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load incident audit history.");
        setLoading(false);
      });
  }, []);

  const filteredIncidents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesRecipient = recipientFilter === "all" || incident.latest_recipient_type === recipientFilter;
      const haystack = [
        `INC-${incident.id}`,
        incident.site_id,
        incident.charger_id,
        incident.latest_input_component,
        incident.latest_observation_result,
        incident.latest_fault_type_v2,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesRecipient && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [incidents, query, recipientFilter]);

  if (loading) {
    return (
      <PageShell maxWidth="5xl">
        <Card className="app-card p-8 text-center text-sm font-semibold text-slate-500">
          Loading incident audit history...
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell maxWidth="5xl">
        <Card className="rounded-2xl border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
          {error}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-700" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Incident Audit History</h1>
          </div>
          <p className="text-lg text-slate-600">Internal triage records for staff review, QA, and replay.</p>
        </div>
        <Button asChild variant="outline" size="lg" className="h-12 rounded-xl font-bold">
          <Link href="/staff/dashboard">Back to Staff Queue</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by incident, site, component, or observation"
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 font-medium"
          />
        </div>
        <Tabs value={recipientFilter} onValueChange={setRecipientFilter}>
          <TabsList className="grid grid-cols-4 rounded-xl bg-slate-100">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="after_sales_team">After-sales</TabsTrigger>
            <TabsTrigger value="unknown">Review</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">ID</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Time</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Site / Charger</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Observation & Fault</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-right text-xs font-bold uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-medium text-slate-500">
                    No incidents recorded yet.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-5 font-mono font-bold text-slate-900">INC-{incident.id}</td>
                    <td className="whitespace-nowrap px-6 py-5 font-medium text-slate-500">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{incident.site_id}</div>
                      <div className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-500">
                        {incident.charger_id || "UNSPECIFIED"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="mb-1 font-bold text-slate-900">
                        {formatObservationResult(incident.latest_observation_result)}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-widest text-slate-500">
                          {formatInputComponent(incident.latest_input_component)}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="font-medium text-slate-600">
                          {formatFaultTypeV2(incident.latest_fault_type_v2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <IncidentStatusBadge recipientType={incident.latest_recipient_type} />
                        {typeof incident.latest_confidence_score === "number" && (
                          <span className="text-xs font-medium text-slate-500">
                            Conf: {Math.round(incident.latest_confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {incident.latest_stage === "triage_result" ? (
                        <Button variant="ghost" size="sm" className="rounded-lg font-bold text-blue-700 hover:bg-blue-50 hover:text-blue-800" asChild>
                          <Link href={`/result?replay=${incident.id}`}>Replay</Link>
                        </Button>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-widest text-slate-400">
                          Incomplete
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredIncidents.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
              No incidents recorded yet.
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <Link key={incident.id} href={`/result?replay=${incident.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-extrabold text-slate-900">INC-{incident.id}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <IncidentStatusBadge recipientType={incident.latest_recipient_type} />
                </div>
                <p className="text-base font-extrabold text-slate-950">
                  {formatObservationResult(incident.latest_observation_result)}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {formatInputComponent(incident.latest_input_component)} / {formatFaultTypeV2(incident.latest_fault_type_v2)}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
