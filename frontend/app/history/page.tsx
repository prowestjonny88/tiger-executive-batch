"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Database, Plus, Search } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  fetchIncidents,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  IncidentHistoryItem,
} from "../../lib/api";
import { PageShell } from "../../components/layout/page-shell";
import { IncidentStatusBadge } from "../../components/triage/incident-status-badge";

export default function HistoryPage() {
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
        setError(err instanceof Error ? err.message : "Failed to load history");
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
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 font-medium animate-pulse">Loading incident history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 max-w-md text-center">
          <p className="font-bold mb-1">Error</p>
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell maxWidth="6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-green-700" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Report History
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Past charger, EVDB, and isolator checks.
          </p>
        </div>
        <Button asChild size="lg" className="bg-green-700 hover:bg-green-800 rounded-xl h-12 shadow-sm font-bold flex items-center gap-2">
          <Link href="/upload">
            <Plus className="w-5 h-5" /> New Incident
          </Link>
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs">ID</th>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs">Time</th>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs">Site / Charger</th>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs">Observation & Fault</th>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs">Status</th>
                <th className="px-6 py-5 font-bold uppercase tracking-widest text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No incidents recorded yet.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900 font-mono">INC-{incident.id}</td>
                    <td className="px-6 py-5 text-slate-500 font-medium whitespace-nowrap">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{incident.site_id}</div>
                      <div className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-widest">
                        {incident.charger_id || "UNSPECIFIED"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900 mb-1">
                        {formatObservationResult(incident.latest_observation_result)}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 uppercase tracking-widest font-semibold">
                          {formatInputComponent(incident.latest_input_component)}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600 font-medium">
                          {formatFaultTypeV2(incident.latest_fault_type_v2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <IncidentStatusBadge recipientType={incident.latest_recipient_type} />
                        {typeof incident.latest_confidence_score === "number" && (
                          <span className="text-xs text-slate-500 font-medium">
                            Conf: {Math.round(incident.latest_confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {incident.latest_stage === "triage_result" ? (
                        <Button variant="ghost" size="sm" className="font-bold text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg" asChild>
                          <Link href={`/result?replay=${incident.id}`}>View Details</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Incomplete</span>
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
            filteredIncidents.map((incident) => {
              const card = (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-extrabold text-slate-900">INC-{incident.id}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <IncidentStatusBadge recipientType={incident.latest_recipient_type} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-extrabold text-slate-950">
                      {formatObservationResult(incident.latest_observation_result)}
                    </p>
                    <p className="text-sm font-semibold text-slate-600">
                      {formatInputComponent(incident.latest_input_component)} / {formatFaultTypeV2(incident.latest_fault_type_v2)}
                    </p>
                    <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                      {incident.charger_id || incident.site_id}
                    </p>
                    {typeof incident.latest_confidence_score === "number" && (
                      <p className="text-xs font-medium text-slate-500">
                        Confidence: {Math.round(incident.latest_confidence_score * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              );

              return incident.latest_stage === "triage_result" ? (
                <Link key={incident.id} href={`/result?replay=${incident.id}`} className="block">
                  {card}
                </Link>
              ) : (
                <div key={incident.id} className="opacity-75">
                  {card}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageShell>
  );
}
