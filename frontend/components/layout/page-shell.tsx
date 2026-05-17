import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl";
}

export function PageShell({ children, className, maxWidth = "5xl" }: PageShellProps) {
  const maxWidthClass = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
  }[maxWidth];

  return (
    <div className={cn("w-full mx-auto px-6 py-10 md:py-12", maxWidthClass, className)}>
      {children}
    </div>
  );
}
