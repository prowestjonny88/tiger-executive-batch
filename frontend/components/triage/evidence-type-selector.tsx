"use client";

import { BatteryCharging, HelpCircle, Power, Zap } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { cn } from "../../lib/utils";

export type EvidenceTypeOption = "charger" | "evdb" | "isolator" | "unknown";

const options: Array<{
  value: EvidenceTypeOption;
  title: string;
  description: string;
  icon: typeof Zap;
}> = [
  { value: "charger", title: "Charger Unit", description: "Indicator lights, serial label, front panel", icon: BatteryCharging },
  { value: "evdb", title: "EVDB", description: "MCB/RCCB labels, breaker state, component specs", icon: Zap },
  { value: "isolator", title: "Isolator Switch", description: "ON/OFF switch position", icon: Power },
  { value: "unknown", title: "Not Sure", description: "Upload the clearest photo of the issue", icon: HelpCircle },
];

export function EvidenceTypeSelector({
  value,
  onChange,
}: {
  value: EvidenceTypeOption;
  onChange: (value: EvidenceTypeOption) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={(next) => onChange(next as EvidenceTypeOption)} className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <Label
            key={option.value}
            htmlFor={`evidence-${option.value}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
              active ? "border-green-500 bg-green-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <RadioGroupItem value={option.value} id={`evidence-${option.value}`} className="sr-only" />
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", active ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600")}>
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-extrabold text-slate-950">{option.title}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{option.description}</span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
