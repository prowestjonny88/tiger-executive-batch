import { Link } from "react-router";
import svgPaths from "../../imports/6SafeGuidance/svg-onv6w9xh1f";
import bgImage from "figma:asset/b852eb2329309cdeb1214b6d6eecb969b747f2dc.png";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function SafeGuidance() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      
      {/* Guidance Card */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full flex flex-col overflow-hidden mb-8 relative z-10">
        
        {/* Header Graphic Area */}
        <div className="relative h-48 w-full bg-slate-50 flex items-center justify-center overflow-hidden">
          {/* Background Image Overlay */}
          <div className="absolute inset-0 opacity-10">
             <ImageWithFallback src={bgImage} alt="Background graphic" className="w-full h-full object-cover scale-150" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="bg-green-400 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-green-950" fill="none" viewBox="0 0 20 25">
                <path d={svgPaths.p2256d300} fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-800 drop-shadow-sm">Operational Protocol</h3>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-10 md:p-14 flex flex-col items-center">
          
          <h1 className="text-3xl font-extrabold text-slate-900 mb-8 tracking-tight text-center">
            Recommended Safe Actions
          </h1>

          {/* Action Steps */}
          <div className="flex flex-col gap-4 w-full mb-10">
            
            <div className="bg-slate-50 rounded-xl p-5 flex items-start gap-5 shadow-sm border border-slate-100">
              <div className="bg-green-700 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm text-sm">
                1
              </div>
              <p className="text-slate-800 font-medium text-lg leading-relaxed pt-0.5">
                Unplug the connector from the vehicle
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 flex items-start gap-5 shadow-sm border border-slate-100">
              <div className="bg-green-700 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm text-sm">
                2
              </div>
              <p className="text-slate-800 font-medium text-lg leading-relaxed pt-0.5">
                Wait 30 seconds for the unit to reset
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 flex items-start gap-5 shadow-sm border border-slate-100">
              <div className="bg-green-700 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm text-sm">
                3
              </div>
              <p className="text-slate-800 font-medium text-lg leading-relaxed pt-0.5">
                Firmly reconnect and listen for the click
              </p>
            </div>

          </div>

          {/* Caution Box */}
          <div className="bg-slate-100 border-l-4 border-slate-400 rounded-r-xl p-8 mb-10 shadow-inner w-full flex items-start gap-5">
            <svg className="w-6 h-6 text-slate-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 22 21">
              <path d={svgPaths.p1458c600} fill="currentColor" />
            </svg>
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Caution</h4>
              <p className="text-slate-700 font-medium leading-relaxed">
                Do not attempt to open the charger panel or touch exposed wires.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col items-center gap-6 w-full mt-2">
            <button className="bg-gradient-to-r from-green-700 to-green-500 text-white font-bold text-lg py-4 px-10 rounded-xl transition-all shadow-md hover:shadow-lg w-full flex justify-center items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 12 12">
                <path d={svgPaths.p117df680} fill="currentColor" />
              </svg>
              Retry Connection
            </button>
            <Link to="/escalation" className="text-slate-500 hover:text-slate-800 font-bold py-2 px-4 transition-colors flex items-center gap-2 text-sm border-b-2 border-transparent hover:border-slate-300">
              Still not working? Escalation required
              <svg className="w-3 h-3" fill="none" viewBox="0 0 9.33333 9.33333">
                <path d={svgPaths.pce77c00} fill="currentColor" />
              </svg>
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
