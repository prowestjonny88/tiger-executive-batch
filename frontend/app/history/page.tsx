"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card } from "../../components/ui/card";

export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/staff/history");
  }, [router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="app-card max-w-md p-8 text-center">
        <p className="technical-label text-blue-700">Staff Only</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">Opening Incident Audit History</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Raw incident records are available only from the staff audit area.
        </p>
      </Card>
    </div>
  );
}
