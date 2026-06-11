"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const syncRole = useCallback(() => setRole(window.localStorage.getItem("chargerdoc_role")), []);

  useEffect(() => {
    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("chargerdoc_role_changed", syncRole);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("chargerdoc_role_changed", syncRole);
    };
  }, [syncRole]);

  useEffect(() => {
    syncRole();
  }, [pathname, syncRole]);

  if (pathname === "/") {
    return null;
  }

  // Helper to check active state
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/portal") {
      return pathname.startsWith("/login") || pathname.startsWith("/customer") || pathname.startsWith("/staff");
    }
    return pathname.startsWith(path);
  };

  const navLinks =
    role === "customer"
      ? [
          { name: "Home", href: "/", activeKey: "/" },
          { name: "My Tickets", href: "/customer/dashboard", activeKey: "/customer/dashboard" },
          { name: "New Ticket", href: "/customer/new-ticket", activeKey: "/customer/new-ticket" },
          { name: "Safety", href: "/safety", activeKey: "/safety" },
          { name: "Switch Role", href: "/login", activeKey: "/login" },
        ]
      : role === "staff"
        ? [
            { name: "Home", href: "/", activeKey: "/" },
            { name: "Ticket Queue", href: "/staff/dashboard", activeKey: "/staff/dashboard" },
            { name: "Incident Audit", href: "/staff/history", activeKey: "/staff/history" },
            { name: "Safety", href: "/safety", activeKey: "/safety" },
            { name: "Switch Role", href: "/login", activeKey: "/login" },
          ]
        : [
            { name: "Home", href: "/", activeKey: "/" },
            { name: "Portal", href: "/login", activeKey: "/portal" },
            { name: "Safety", href: "/safety", activeKey: "/safety" },
          ];
  const cta = role === "customer"
    ? { href: "/customer/new-ticket", label: "New Ticket" }
    : role === "staff"
      ? { href: "/staff/dashboard", label: "Ticket Queue" }
      : { href: "/login", label: "Start Report" };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-green-700" />
          ChargerDoc
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {pathname === "/" ? (
            <>
              <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="font-medium text-slate-600 hover:text-slate-900 transition-colors pb-1 border-b-2 border-transparent">How It Works</button>
              <button onClick={() => document.getElementById("inputs")?.scrollIntoView({ behavior: "smooth" })} className="font-medium text-slate-600 hover:text-slate-900 transition-colors pb-1 border-b-2 border-transparent">Inputs</button>
              <button onClick={() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" })} className="font-medium text-slate-600 hover:text-slate-900 transition-colors pb-1 border-b-2 border-transparent">Preview</button>
              <button onClick={() => document.getElementById("safety")?.scrollIntoView({ behavior: "smooth" })} className="font-medium text-slate-600 hover:text-slate-900 transition-colors pb-1 border-b-2 border-transparent">Safety</button>
            </>
          ) : (
            navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`font-medium transition-colors pb-1 ${
                  isActive(link.activeKey)
                    ? "text-green-700 font-semibold border-b-2 border-green-700"
                    : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                }`}
              >
                {link.name}
              </Link>
            ))
          )}
        </nav>

        <div className="hidden md:block">
          <Link
            href={cta.href}
            className="bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            {cta.label}
          </Link>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md">
                <Menu className="w-6 h-6" />
                <span className="sr-only">Open menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] pt-12">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <p className="text-xl font-extrabold text-slate-950">ChargerDoc</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">EV charger support flow</p>
              </div>
              <nav className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`text-lg font-medium transition-colors ${
                      isActive(link.activeKey) ? "text-green-700 font-bold" : "text-slate-600"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="pt-6 border-t border-slate-100">
                  <Link
                    href={cta.href}
                    onClick={() => setOpen(false)}
                    className="flex justify-center bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm w-full"
                  >
                    {cta.label}
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
