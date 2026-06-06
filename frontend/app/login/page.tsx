"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, Headphones, Zap } from "lucide-react";

import { PageShell } from "../../components/layout/page-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  const selectRole = (role: "customer" | "staff") => {
    window.localStorage.setItem("chargerdoc_role", role);
    router.push(role === "customer" ? "/customer/new-ticket" : "/staff/dashboard");
  };

  return (
    <PageShell maxWidth="4xl">
      <Card className="app-card overflow-hidden p-8 md:p-12">
        <div className="mb-10 flex items-start gap-4">
          <div className="rounded-2xl bg-green-50 p-3 text-green-700">
            <Zap className="h-7 w-7" />
          </div>
          <div>
            <p className="technical-label text-green-700">ChargerDoc Support Portal</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
              Choose your demo role
            </h1>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Submit charger evidence as a customer, or manage support tickets as after-sales staff.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => selectRole("customer")}
            className="rounded-2xl border border-green-200 bg-green-50/70 p-6 text-left shadow-sm transition hover:border-green-500 hover:bg-green-50"
          >
            <ClipboardList className="mb-5 h-8 w-8 text-green-700" />
            <h2 className="text-2xl font-extrabold text-slate-950">Continue as Customer</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Create a support ticket, upload evidence, track progress, and submit feedback after resolution.
            </p>
            <Button className="mt-6 rounded-xl bg-green-700 font-bold hover:bg-green-800">
              Start Customer Flow
            </Button>
          </button>

          <button
            type="button"
            onClick={() => selectRole("staff")}
            className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 text-left shadow-sm transition hover:border-blue-500 hover:bg-blue-50"
          >
            <Headphones className="mb-5 h-8 w-8 text-blue-700" />
            <h2 className="text-2xl font-extrabold text-slate-950">Continue as Staff</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Review ticket queues, update statuses, schedule visits, and prepare customer-ready updates.
            </p>
            <Button className="mt-6 rounded-xl bg-blue-700 font-bold hover:bg-blue-800">
              Open Staff Queue
            </Button>
          </button>
        </div>
      </Card>
    </PageShell>
  );
}
