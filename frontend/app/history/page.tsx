"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fetchIncidents, IncidentHistoryItem } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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
        <p className="text-muted-foreground">Loading incident history...</p>
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
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Incident Database
          </h1>
          <p className="mt-2 text-slate-600">
            Recent triaged incidents across all sites.
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
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Fault</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider">Resolver Tier</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No incidents recorded yet.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      INC-{incident.id}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{incident.site_id}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{incident.charger_id || "Unspecified"}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-slate-700">
                      {incident.latest_fault || "Pending"}
                    </td>
                    <td className="px-6 py-4">
                      {incident.latest_resolver_tier ? (
                        <Badge
                          variant={
                            incident.latest_resolver_tier === "driver"
                              ? "success"
                              : incident.latest_resolver_tier === "local_site_resolver"
                                ? "warning"
                                : incident.latest_resolver_tier === "technician"
                                  ? "destructive"
                                  : "default"
                          }
                        >
                          {incident.latest_resolver_tier.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {incident.latest_stage === "triage_result" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-primary"
                          asChild
                        >
                          <Link href={`/result?replay=${incident.id}`}>
                            View
                          </Link>
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
