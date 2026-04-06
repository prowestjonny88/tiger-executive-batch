import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-screen bg-[#fbf9f8] flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
            RExharge
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
            <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">Network</Link>
            <Link to="/" className="text-green-700 font-semibold border-b-2 border-green-700 pb-1">Support</Link>
            <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">Safety</Link>
          </nav>
          <Link to="/" className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-md transition-colors shadow-sm">
            Get Help
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full relative">
        <Outlet />
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-lg font-bold text-slate-900 mb-2">RExharge</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              © 2024 RExharge Infrastructure. Engineered for Reliability.
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-600 font-medium uppercase tracking-wider">
            <Link to="/" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">System Status</Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
