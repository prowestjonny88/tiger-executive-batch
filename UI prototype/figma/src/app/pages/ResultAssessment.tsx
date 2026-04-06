import { Link } from "react-router";
import svgPaths from "../../imports/5ResultAssessment/svg-li50nl9dl4";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export function ResultAssessment() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-8 relative z-10 pt-4">
        {/* Tonal Accent Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-700 opacity-90 z-20"></div>

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className="bg-slate-200 text-white w-16 h-16 flex items-center justify-center rounded-2xl mb-10 shadow-inner relative">
            <svg className="w-8 h-8 drop-shadow-md" fill="none" viewBox="0 0 27 24">
              <path d={svgPaths.p3b120c80} fill="currentColor" />
            </svg>
            
            <Badge variant="success" className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 shadow-sm backdrop-blur-md z-10 border border-green-200 flex items-center gap-1.5 whitespace-nowrap">
              <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 12.8333 12.25">
                <path d={svgPaths.p3b404880} fill="currentColor" />
              </svg>
              High Confidence (94%)
            </Badge>
          </div>

          <CardTitle className="text-3xl font-extrabold mb-6 tracking-tight leading-snug">
            Potential Connection Issue Detected
          </CardTitle>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-6 flex flex-col items-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-10 shadow-sm w-full max-w-lg mx-auto text-center">
            <p className="text-slate-700 text-lg leading-relaxed font-medium">
              Based on the photo and your answers, there appears to be a minor synchronization error between the charger and the vehicle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-10 text-left">
            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Detected Asset</h4>
              <p className="font-bold text-slate-900 text-lg">RX-Charger 09-A</p>
            </div>
            <div className="bg-slate-50 border-l-4 border-green-600 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Status</h4>
              <p className="font-bold text-slate-900 text-lg">Maintenance Recommended</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
            <Button asChild size="lg" className="w-full text-lg h-14 rounded-xl font-bold shadow-md">
              <Link to="/guidance">View Next Steps</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full h-14 rounded-xl font-bold text-slate-600 flex items-center justify-center gap-3">
              <Link to="/upload">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 9.33333">
                  <path d={svgPaths.p2db3a360} fill="currentColor" />
                </svg>
                Run Diagnosis Again
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Context Hint */}
      <div className="flex items-center justify-center gap-6 w-full text-slate-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 15 15">
            <path d={svgPaths.p15221b80} fill="currentColor" />
          </svg>
          Analyzed in 1.4s
        </div>
        <div className="w-px h-4 bg-slate-300"></div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16.5 12">
            <path d={svgPaths.p32b04540} fill="currentColor" />
          </svg>
          Data Logged Securely
        </div>
      </div>

    </div>
  );
}
