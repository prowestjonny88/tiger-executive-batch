"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { PageShell } from "../../components/layout/page-shell";
import { Card, CardContent } from "../../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

export default function SafetyPage() {
  return (
    <PageShell maxWidth="4xl">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <div className="mb-5 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-green-700" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Stay safe first.
          </h1>
        </div>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">
          Take photos only from a safe distance. RExharge can guide visible evidence checks, but electrical repair decisions should be verified by qualified personnel.
        </p>
      </div>

      <Alert variant="destructive" className="mb-6 rounded-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Stop immediately if hazards are visible</AlertTitle>
        <AlertDescription>
          If you see smoke, heat, sparks, water ingress, exposed conductors, or melted parts, stop using the charger and escalate.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card className="border-red-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-bold text-red-900 uppercase tracking-widest">Critical Warnings</h2>
          </div>
          <CardContent className="p-6 md:p-8">
            <ul className="space-y-4">
              {[
                ["Never open internal electrical panels", "Only qualified and certified technicians should open the internal casing of EV chargers or primary distribution boards."],
                ["Do not touch exposed wires", "If you see exposed wiring, melted components, or physical damage, stay away and escalate immediately."],
                ["Water and electricity do not mix", "Do not interact with the charger or EVDB if there is standing water around the equipment."],
              ].map(([title, text], index) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                    {index + 1}
                  </span>
                  <div>
                    <strong className="block mb-1 text-slate-900">{title}</strong>
                    <p className="text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-6 md:p-8">
            <Accordion type="single" collapsible defaultValue="before-photo">
              {[
                ["before-photo", "Before taking a photo", "Stand back, use zoom if needed, and keep hands away from live parts."],
                ["safe-checks", "Safe things you can check", "External charger lights, exterior labels, accessible isolator position, and visible breaker state."],
                ["technician-only", "What only technicians should do", "Opening internal casing, touching wiring, replacing breakers, or working near exposed conductors."],
              ].map(([value, title, text]) => (
                <AccordionItem key={value} value={value}>
                  <AccordionTrigger className="text-left font-extrabold">{title}</AccordionTrigger>
                  <AccordionContent className="text-sm font-medium leading-7 text-slate-600">{text}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Charger Unit", "Safe to photograph indicator and exterior label."],
            ["EVDB", "Do not open internal covers unless authorized."],
            ["Isolator", "Only operate accessible external switch if safe."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <CheckCircle2 className="mb-3 size-5 text-green-700" />
              <p className="font-extrabold text-slate-950">{title}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
