import Link from "next/link";
import type { ReactNode } from "react";

type NavKey = "home" | "report" | "history";

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "home", label: "Home", href: "/" },
  { key: "report", label: "Report", href: "/intake" },
  { key: "history", label: "History", href: "/demo" },
];

type Props = {
  activeNav?: NavKey;
  children: ReactNode;
};

export function SiteShell({ activeNav = "home", children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link className="brand" href="/">
            RExharge
          </Link>
          <nav className="app-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.key} className={item.key === activeNav ? "active" : undefined} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="support-link">Help &amp; Support</span>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>(c) 2026 RExharge Precision Systems</span>
          <div className="app-footer__links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact Engineering</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
