import { Link } from "react-router";
import svgPaths from "../../imports/2PhotoUpload/svg-cwyu35rr3g";

export function PhotoUpload() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16 relative">
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 md:p-12 w-full flex flex-col relative overflow-hidden">
        
        {/* Top Right Decorative SVG */}
        <div className="absolute right-0 top-0 pointer-events-none opacity-90">
          <svg className="w-32 h-32" fill="none" viewBox="0 0 128 128">
            <g clipPath="url(#clip0_2_800)">
              <path d="M0 0H128V128L0 0" fill="#006E28" />
            </g>
            <defs>
              <clipPath id="clip0_2_800">
                <rect fill="white" height="128" width="128" />
              </clipPath>
            </defs>
          </svg>
        </div>

        {/* Header */}
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Upload a Photo</h1>
          <p className="text-slate-600 text-lg">A clear photo helps our team diagnose the issue quickly.</p>
        </div>

        {/* Upload Area */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center min-h-[280px] p-10 relative mb-10 transition-colors hover:bg-slate-100 hover:border-green-400 group">
          <div className="bg-slate-200 text-green-700 w-16 h-16 flex flex-col items-center justify-center rounded-xl mb-4 group-hover:bg-green-100 transition-colors shadow-sm">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 30 27">
                <path d={svgPaths.p177cbc00} fill="currentColor" />
             </svg>
          </div>
          <p className="font-semibold text-slate-900 text-lg mb-1">Tap to capture or upload</p>
          <p className="text-slate-500 text-sm">JPEG, PNG up to 10MB</p>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/jpeg, image/png" />
        </div>

        {/* Capture Tips */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px bg-slate-300 w-6"></div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Capture Tips</h3>
            <div className="h-px bg-slate-300 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-4 flex items-center gap-4 shadow-sm">
               <svg className="w-5 h-5 text-green-800" fill="none" viewBox="0 0 15 13.5">
                 <path d={svgPaths.p19c07780} fill="currentColor" />
               </svg>
               <span className="text-sm font-semibold text-slate-800 leading-tight">Include the<br/>screen</span>
            </div>
            <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-4 flex items-center gap-4 shadow-sm">
               <svg className="w-5 h-5 text-green-800" fill="none" viewBox="0 0 13.5 13.5">
                 <path d={svgPaths.p2d5bbe80} fill="currentColor" />
               </svg>
               <span className="text-sm font-semibold text-slate-800 leading-tight">Show the<br/>connector area</span>
            </div>
            <div className="bg-slate-50 border-l-4 border-green-400 rounded-md p-4 flex items-center gap-4 shadow-sm">
               <svg className="w-5 h-5 text-green-800" fill="none" viewBox="0 0 16.5 16.5">
                 <path d={svgPaths.p33c29780} fill="currentColor" />
               </svg>
               <span className="text-sm font-semibold text-slate-800 leading-tight">Avoid direct sun<br/>glare</span>
            </div>
          </div>
        </div>

        {/* Optional Field */}
        <div className="mb-10">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-2">Charger ID (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. RX-2049-A" 
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
          <Link
            to="/quality"
            className="bg-green-700 hover:bg-green-800 text-white font-bold text-lg py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 w-full"
          >
            Continue
            <svg className="w-4 h-4" fill="none" viewBox="0 0 13.3333 13.3333">
              <path d={svgPaths.p32510800} fill="currentColor" />
            </svg>
          </Link>
          <Link
            to="/quality"
            className="text-slate-500 hover:text-slate-800 font-semibold py-3 text-center transition-colors w-full rounded-lg hover:bg-slate-50"
          >
            Skip for now
          </Link>
        </div>

      </div>
    </div>
  );
}
