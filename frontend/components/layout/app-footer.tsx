"use client";

import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto w-full">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col items-center justify-center gap-2">
        <div className="text-sm font-bold text-slate-700">RExharge</div>
        <div className="text-xs text-slate-500 font-medium text-center">
          Safe guidance &bull; User friendly &bull; After-sales routing when needed
        </div>
      </div>
    </footer>
  );
}
