import { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { type TicketTone, toneClass } from "../../lib/ticket-ui";

interface KpiCardProps {
  label: string;
  value: number | string;
  helper?: string;
  tone?: TicketTone;
  active?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

export function KpiCard({ label, value, helper, tone = "slate", active = false, icon, onClick }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="technical-label text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
        </div>
        {icon && <div className={cn("rounded-xl border p-2", toneClass(tone))}>{icon}</div>}
      </div>
      {helper && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{helper}</p>}
    </>
  );
  const className = cn(
    "group rounded-2xl border bg-white p-4 text-left shadow-sm transition",
    onClick && "hover:-translate-y-0.5 hover:shadow-md",
    active ? toneClass(tone) : "border-slate-200 text-slate-900"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
