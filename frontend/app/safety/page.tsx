"use client";

import { ShieldAlert, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageShell } from "../../components/layout/page-shell";
import { Card, CardContent } from "../../components/ui/card";

export default function SafetyPage() {
  return (
    <PageShell maxWidth="4xl">
      <div className="mb-8 flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-green-700" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Safety Guidelines
        </h1>
      </div>
      
      <p className="text-lg text-slate-600 mb-8 max-w-3xl">
        Your safety is our priority. Please review these critical safety guidelines before interacting with any electrical components related to EV chargers.
      </p>

      <div className="grid gap-6">
        <Card className="border-red-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-bold text-red-900 uppercase tracking-widest">Critical Warnings</h2>
          </div>
          <CardContent className="p-6 md:p-8">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm mt-0.5">1</span>
                <div>
                  <strong className="text-slate-900 block mb-1">Never open internal electrical panels</strong>
                  <p className="text-slate-600">Only qualified and certified technicians should open the internal casing of EV chargers or primary distribution boards.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm mt-0.5">2</span>
                <div>
                  <strong className="text-slate-900 block mb-1">Do not touch exposed wires</strong>
                  <p className="text-slate-600">If you see any exposed wiring, melted components, or physical damage, stay away and escalate immediately.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm mt-0.5">3</span>
                <div>
                  <strong className="text-slate-900 block mb-1">Water and electricity do not mix</strong>
                  <p className="text-slate-600">Do not interact with the charger or EVDB if there is standing water around the equipment or if the equipment is heavily submerged.</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Safe Interactions</h2>
          </div>
          <CardContent className="p-6 md:p-8">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 block mb-1">Checking indicator lights</strong>
                  <p className="text-slate-600">It is completely safe to observe and photograph the external indicator lights on the charger.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 block mb-1">Reading serial numbers</strong>
                  <p className="text-slate-600">You may safely photograph labels, QR codes, and serial numbers located on the exterior casing.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 block mb-1">Operating accessible switches</strong>
                  <p className="text-slate-600">Resetting external, customer-accessible MCBs/RCCBs or Isolator switches is safe when following guided instructions. Do not force switches that refuse to stay closed (tripped state).</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
