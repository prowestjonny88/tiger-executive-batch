import { Link } from "react-router";
import svgPaths from "../../imports/1WelcomeStartReport/svg-tqovfvsl6c";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-4xl mx-auto px-6 py-16">
      <Card className="w-full max-w-2xl overflow-hidden border-slate-200 shadow-md">
        <CardHeader className="text-center pt-12 pb-8">
          <div className="mx-auto bg-green-50 text-green-700 w-20 h-20 flex items-center justify-center rounded-2xl mb-8 shadow-sm">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 33 28.5">
              <path d={svgPaths.p273fe80} fill="currentColor" />
            </svg>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-extrabold mb-4">Report Charger Issue</CardTitle>
          <CardDescription className="text-lg text-slate-600 max-w-lg mx-auto">
            Tell us what's happening and we'll guide you through the safest next steps. This process takes less than 2 minutes.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center pb-12">
          <Button asChild size="lg" className="w-full max-w-sm h-14 text-lg font-bold rounded-xl shadow-md">
            <Link to="/upload">Start Report</Link>
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 py-6 bg-slate-50">
          <div className="flex items-center gap-3 text-green-800 font-semibold text-sm tracking-wide uppercase opacity-90">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 18.3333 17.5">
              <path d={svgPaths.pb849500} fill="currentColor" />
            </svg>
            Verified RExharge Infrastructure Support
          </div>
        </CardFooter>
      </Card>

      {/* Bottom Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
        <Card className="flex items-center gap-4 p-5 shadow-sm bg-white/60 backdrop-blur-sm border-slate-200">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 16 20">
            <path d={svgPaths.p12df5c00} fill="currentColor" />
          </svg>
          <span className="font-semibold text-slate-800">Electrical Safety</span>
        </Card>
        
        <Card className="flex items-center gap-4 p-5 shadow-sm bg-white/60 backdrop-blur-sm border-slate-200">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 16 20">
            <path d={svgPaths.p1869180} fill="currentColor" />
          </svg>
          <span className="font-semibold text-slate-800">Auto-Location</span>
        </Card>
        
        <Card className="flex items-center gap-4 p-5 shadow-sm bg-white/60 backdrop-blur-sm border-slate-200">
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 20 18">
            <path d={svgPaths.p20cc9b00} fill="currentColor" />
          </svg>
          <span className="font-semibold text-slate-800">24/7 Dispatch</span>
        </Card>
      </div>
    </div>
  );
}
