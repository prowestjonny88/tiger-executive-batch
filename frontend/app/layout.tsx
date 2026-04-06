import "./globals.css";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "RExharge Precision Flow",
  description: "Confidence-aware EV charger troubleshooting with a premium technical-manual interface.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${manrope.variable} min-h-screen bg-[#fbf9f8] flex flex-col font-sans text-slate-900`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
              RExharge
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
              <Link href="/history" className="text-slate-600 hover:text-slate-900 font-medium">History</Link>
              <Link href="/" className="text-green-700 font-semibold border-b-2 border-green-700 pb-1">Support</Link>
              <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium">Safety</Link>
            </nav>
            <Link href="/upload" className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-md transition-colors shadow-sm">
              Get Help
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full relative">
          {children}
        </main>

        <footer className="bg-slate-50 border-t border-slate-200 mt-auto w-full">
          <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-slate-900 mb-2">RExharge</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                © 2024 RExharge Infrastructure. Engineered for Reliability.
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-600 font-medium uppercase tracking-wider">
              <Link href="/" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
              <Link href="/" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
              <Link href="/" className="hover:text-slate-900 transition-colors">System Status</Link>
              <Link href="/" className="hover:text-slate-900 transition-colors">Contact Support</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
