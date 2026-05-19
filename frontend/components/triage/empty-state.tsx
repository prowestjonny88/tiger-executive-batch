import { AlertCircle } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <AlertCircle className="size-6" />
      </div>
      <p className="text-base font-extrabold text-slate-900">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}
