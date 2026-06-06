"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card } from "../../components/ui/card";

export default function UploadRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const role = window.localStorage.getItem("chargerdoc_role");
    router.replace(role === "customer" ? "/customer/new-ticket" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="app-card max-w-md p-8 text-center">
        <p className="technical-label text-green-700">Redirecting</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">Opening the ChargerDoc support flow</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Customer reports now start from the guided ticket workflow.
        </p>
      </Card>
    </div>
  );
}
