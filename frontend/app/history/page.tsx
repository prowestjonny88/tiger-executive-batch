"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  fetchIncidents,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  formatRecipientType,
  IncidentHistoryItem,
} from "../../lib/api";

export default function HistoryPage() {
  const [incidents, setIncidents] = useState<IncidentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading Theme 2 incident history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Theme 2 Incident Database
          </h1>
          <p className="mt-2 text-slate-600">
            Recent charger, EVDB, and isolator assessments.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">New Incident</Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Site / Charger</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Observation</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Fault Type</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No incidents recorded yet.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">INC-{incident.id}</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{incident.site_id}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{incident.charger_id || "Unspecified"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {formatObservationResult(incident.latest_observation_result)}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {formatInputComponent(incident.latest_input_component)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">{formatFaultTypeV2(incident.latest_fault_type_v2)}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Badge variant={incident.latest_recipient_type === "after_sales_team" ? "warning" : "success"}>
                          {formatRecipientType(incident.latest_recipient_type)}
                        </Badge>
                        {incident.latest_assigned_team_id ? (
                          <span className="text-xs text-slate-500">Team: {incident.latest_assigned_team_id}</span>
                        ) : null}
                        {typeof incident.latest_confidence_score === "number" ? (
                          <span className="text-xs text-slate-500">
                            Confidence: {Math.round(incident.latest_confidence_score * 100)}%
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {incident.latest_stage === "triage_result" ? (
                        <Button variant="ghost" size="sm" className="font-semibold text-primary" asChild>
                          <Link href={`/result?replay=${incident.id}`}>View</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">Incomplete</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
