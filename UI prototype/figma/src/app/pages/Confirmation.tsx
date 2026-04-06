import { Link } from "react-router";
import svgPaths from "../../imports/8Confirmation/svg-sylya79o1n";

export function Confirmation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      
      {/* Confirmation Card */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-3xl w-full flex flex-col items-center overflow-hidden mb-6 relative z-10 p-12 md:p-16 text-center">
        
        {/* Main Icon */}
        <div className="bg-green-400 w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg mb-10 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
          <svg className="w-12 h-12 text-green-950" fill="none" viewBox="0 0 40 40">
            <path d={svgPaths.pf059c0} fill="currentColor" />
          </svg>
        </div>

        {/* Content Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight uppercase leading-none">
          Report Successfully<br/>Submitted
        </h1>
        
        {/* Incident ID Badge */}
        <div className="bg-slate-100 border border-slate-200 text-slate-800 font-mono text-sm font-bold tracking-[0.1em] px-5 py-2.5 rounded-lg shadow-sm mb-8">
          INCIDENT ID: #RX-77291
        </div>

        {/* Subtext */}
        <p className="text-slate-600 text-lg max-w-md mx-auto mb-14 leading-relaxed font-medium">
          Our team is monitoring the situation. You'll receive an update via SMS shortly. Our technical crew has been dispatched to assess the grid telemetry.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
          <Link
            to="/"
            className="bg-gradient-to-r from-green-700 to-green-500 text-white font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg w-full sm:w-auto text-center"
          >
            Find Nearby Charger
          </Link>
          <Link
            to="/"
            className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-sm w-full sm:w-auto text-center"
          >
            Return to Home
          </Link>
        </div>

        {/* Secondary Context Info */}
        <div className="flex items-center justify-between w-full border-t border-slate-200 pt-8 opacity-60">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs uppercase tracking-widest">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 11.6667">
              <path d={svgPaths.p3acbc280} fill="currentColor" />
            </svg>
            Secure Submission
          </div>
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs uppercase tracking-widest">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 11.6667 11.6667">
              <path d={svgPaths.p29478120} fill="currentColor" />
            </svg>
            System Latency: 42ms
          </div>
        </div>

      </div>
    </div>
  );
}
