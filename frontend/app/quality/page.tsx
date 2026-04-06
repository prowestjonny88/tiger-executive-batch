import Link from "next/link";
import svgPaths from "../../imports/3ImageQualityCheck/svg-you6u56l61";
const imgEvChargingStation = "/demo.png";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

export default function ImageQualityCheck() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-4xl mx-auto px-6 py-16">
      <div className="w-full flex flex-col items-center text-center mb-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Image Quality Check</h1>
        <p className="text-slate-600 text-lg max-w-xl leading-relaxed">
          We're verifying that the EV charger status lights are visible for accurate diagnostic reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-5xl items-start">
        
        {/* Left Column: Image Preview */}
        <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="relative rounded-lg overflow-hidden aspect-[4/3] shadow-inner bg-slate-900">
            <ImageWithFallback 
              src={imgEvChargingStation} 
              alt="EV charging station" 
              className="object-cover w-full h-full scale-105" 
            />
            
            {/* Captured Badge Overlay */}
            <div className="absolute top-6 left-6 backdrop-blur-md bg-white/90 border border-white/40 shadow-sm rounded-md px-4 py-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 13.3333 12">
                <path d={svgPaths.p3594c080} fill="currentColor" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Captured</span>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Metadata */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* Analysis Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-green-100/50 w-8 h-8 rounded-full flex items-center justify-center relative">
                <div className="bg-green-700 w-3 h-3 rounded-full shadow-sm"></div>
              </div>
              <h2 className="text-sm font-semibold text-slate-800 leading-tight">Checking image<br/>clarity...</h2>
            </div>
            
            <div className="bg-green-50 border border-green-200/50 rounded-lg p-5 flex items-start gap-4">
              <svg className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p7b061c0} fill="currentColor" />
              </svg>
              <div>
                <h3 className="font-bold text-sm text-green-900 mb-1 leading-tight">Analysis<br/>Complete</h3>
                <p className="text-sm text-green-800/80 leading-snug">The photo looks good. We can see the status light clearly.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <Link
                href="/questions"
                className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-md transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 w-full text-sm"
              >
                Continue
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 13.3333 13.3333">
                  <path d={svgPaths.p32510800} fill="currentColor" />
                </svg>
              </Link>
              <Link
                href="/upload"
                className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 px-6 rounded-md transition-all flex items-center justify-center gap-2 w-full text-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 13.3333 13.3333">
                  <path d={svgPaths.p2e4c9f00} fill="currentColor" />
                </svg>
                Retake Photo
              </Link>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 mb-4">Diagnostic Metadata</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Luminance</span>
                <span className="font-mono font-bold text-green-700">88.4%</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Sharpness</span>
                <span className="font-mono font-bold text-green-700">92.1%</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Asset Detected</span>
                <span className="font-mono font-bold text-slate-900">RX-990-B</span>
              </li>
            </ul>
          </div>
          
        </div>

      </div>
    </div>
  );
}
