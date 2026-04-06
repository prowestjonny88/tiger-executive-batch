import { Link } from "react-router";
import svgPaths from "../../imports/7Escalation/svg-qel37b9gj0";
import mapImage from "figma:asset/85cd3709b871fd60b68fb20cc0cbfab6420e355e.png";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";

export function Escalation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-6 relative z-10">
        <div className="bg-slate-50 border-b border-slate-200 p-6 px-8 flex justify-between items-center w-full">
          <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-widest px-3 py-1 shadow-sm">
            Critical Asset Fault
          </Badge>
          <div className="font-mono text-slate-700 text-sm font-semibold tracking-wider">
            CODE: HW-ERR-7042
          </div>
        </div>

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className="bg-red-100 w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner mb-8 border border-red-200">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 32.85 27">
              <path d={svgPaths.p3e5f5e80} fill="currentColor" />
            </svg>
          </div>

          <CardTitle className="text-3xl font-extrabold mb-4 tracking-tight leading-snug">
            Technician Support Required
          </CardTitle>
          
          <CardDescription className="text-lg max-w-lg mx-auto mb-10 text-slate-600 leading-relaxed">
            This issue requires on-site technical assistance. We've notified the local site responder.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-14 flex flex-col items-center">
          <div className="w-full flex flex-col gap-4 mb-10">
            <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Root Cause Analysis</h4>
              <p className="text-slate-800 font-medium">A hardware fault was detected that cannot be resolved safely by the user.</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Instructions</h4>
                <p className="text-slate-800 font-medium">Please leave the charger as it is. A technician will be dispatched to this location.</p>
              </Card>
              
              <Alert variant="destructive" className="border-l-4 rounded-xl border-red-600">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <AlertTitle className="text-xs font-bold uppercase tracking-widest mb-2">Safety Protocol</AlertTitle>
                <AlertDescription className="font-bold">
                  Safety is our priority. Do not attempt further troubleshooting.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="w-full border-t border-slate-200 pt-10 flex flex-col items-center">
            <div className="flex items-center gap-3 text-slate-700 font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 10.5 12.25">
                <path d={svgPaths.p13490000} fill="currentColor" />
              </svg>
              Estimated Response: 45 Minutes
            </div>

            <div className="w-full h-48 bg-slate-200 rounded-xl overflow-hidden relative mb-8 shadow-inner border border-slate-300">
               <ImageWithFallback src={mapImage} alt="Map" className="w-full h-full object-cover scale-110 opacity-90 saturate-50 mix-blend-multiply" />
               <div className="absolute inset-0 bg-red-600/10 pointer-events-none"></div>
            </div>

            <Button asChild size="lg" variant="secondary" className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-sm rounded-xl">
              <Link to="/confirmation">Return to Asset Overview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="w-full flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-sm"></div>
          <span className="font-mono text-xs font-semibold text-slate-600">TICKET ID: #RX-29381-S</span>
        </div>
        <Button variant="link" asChild className="text-slate-600 hover:text-slate-900 px-0 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-800">
          <Link to="/guidance">View Safety Guidelines</Link>
        </Button>
      </div>

    </div>
  );
}
