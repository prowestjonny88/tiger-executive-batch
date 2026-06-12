import { cn } from "../../lib/utils";

export function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />
      <span>{label}</span>
    </span>
  );
}

export function ButtonLoadingLabel({ label }: { label: string }) {
  return <LoadingSpinner label={label} />;
}

export function PageLoading({ label = "Loading ChargerDoc support view..." }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <LoadingSpinner label={label} />
      <div className="mt-6 grid gap-3">
        <SkeletonLine className="h-5 w-52" />
        <SkeletonLine className="h-8 w-72" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function TicketListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <SkeletonLine className="h-5 w-36" />
            <SkeletonLine className="h-5 w-24 rounded-full" />
            <SkeletonLine className="h-5 w-24 rounded-full" />
          </div>
          <SkeletonLine className="mt-4 h-6 w-56" />
          <SkeletonLine className="mt-3 h-4 w-full" />
          <SkeletonLine className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <div className="space-y-5">
      <PageLoading label="Loading ticket details..." />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <TicketListSkeleton count={2} />
        <TicketListSkeleton count={2} />
      </div>
    </div>
  );
}

type ChecklistStatus = "pending" | "active" | "done";

type DiagnosisChecklistItem = {
  label: string;
  status: ChecklistStatus;
};

export function DiagnosisLoadingCard({
  label = "Checking your charger photo...",
  items = [],
}: {
  label?: string;
  items?: DiagnosisChecklistItem[];
}) {
  return (
    <div className="rounded-3xl border border-green-200 bg-green-50 p-5 shadow-sm">
      <p className="text-base font-extrabold text-green-950">{label}</p>
      {items.length > 0 && (
        <ol className="mt-5 grid gap-3 text-sm font-semibold leading-6 text-slate-700">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <ChecklistIcon status={item.status} />
              <span className={item.status === "active" ? "font-extrabold text-green-900" : "text-slate-700"}>{item.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ChecklistIcon({ status }: { status: ChecklistStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-extrabold text-white">
        OK
      </span>
    );
  }
  if (status === "active") {
    return <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />;
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-200 bg-white" />;
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-slate-100", className)} />;
}
