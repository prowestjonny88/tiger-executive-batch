import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  density?: "form" | "dashboard" | "detail";
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

export function PageShell({ children, className, density = "form", maxWidth = "5xl" }: PageShellProps) {
  const maxWidthClass = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[maxWidth];
  const densityClass = {
    form: "px-6 py-10 md:py-12",
    dashboard: "px-4 py-6 md:px-6 md:py-8",
    detail: "px-6 py-8 md:py-10",
  }[density];

  return (
    <div className={cn("w-full mx-auto", densityClass, maxWidthClass, className)}>
      {children}
    </div>
  );
}
