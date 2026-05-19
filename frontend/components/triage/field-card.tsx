import { cn } from "../../lib/utils";

type FieldCardTone = "neutral" | "green" | "blue" | "amber" | "red";

const toneClasses: Record<FieldCardTone, string> = {
  neutral: "border-slate-200 bg-white",
  green: "border-green-200 bg-green-50/45",
  blue: "border-blue-200 bg-blue-50/55",
  amber: "border-amber-200 bg-amber-50/65",
  red: "border-red-200 bg-red-50/60",
};

export function FieldCard({
  label,
  value,
  helper,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: FieldCardTone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm", toneClasses[tone], className)}>
      <p className="technical-label text-slate-500">{label}</p>
      <p className="mt-1 text-base font-extrabold leading-6 text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}
