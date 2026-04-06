import { Link } from "react-router";
import svgPaths from "../../imports/4AdaptiveQuestions/svg-9543ytu969";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";

export function AdaptiveQuestions() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      
      <Card className="w-full overflow-hidden shadow-lg border-slate-200 mb-8 relative z-10">
        <div className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col gap-5">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Diagnostic Step 2 of 4</span>
            <span className="text-xs font-bold text-green-700">50% Complete</span>
          </div>
          <Progress value={50} className="h-2" />
        </div>

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className="text-green-700 w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 33 33">
              <path d={svgPaths.p6e9d280} fill="currentColor" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight leading-snug mb-4">
            Is the charging LED solid or blinking?
          </CardTitle>
          <CardDescription className="text-lg max-w-lg mx-auto mb-10">
            Check the indicator light located near the charging port on the main unit.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            {/* Option 1: Solid Green */}
            <Link to="/result" className="bg-slate-50 border border-slate-200 hover:border-green-400 hover:bg-slate-100 rounded-xl p-8 flex flex-col items-center text-center transition-all group shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
              <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                <div className="bg-green-700 w-5 h-5 rounded-full"></div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Solid Green</h3>
              <p className="text-slate-600 text-sm">Normal idle state</p>
            </Link>

            {/* Option 2: Blinking Red */}
            <Link to="/result" className="bg-slate-50 border border-slate-200 hover:border-red-400 hover:bg-slate-100 rounded-xl p-8 flex flex-col items-center text-center transition-all group shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
              <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                <div className="bg-red-600 w-5 h-5 rounded-full"></div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Blinking Red</h3>
              <p className="text-slate-600 text-sm">Hardware fault detected</p>
            </Link>

            {/* Option 3: No Light */}
            <Link to="/result" className="bg-slate-50 border border-slate-200 hover:border-slate-400 hover:bg-slate-100 rounded-xl p-8 flex flex-col items-center text-center transition-all group shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
              <div className="bg-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 19.8 20.625">
                  <path d={svgPaths.p3c54ec00} fill="currentColor" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">No Light</h3>
              <p className="text-slate-600 text-sm">Power issue possible</p>
            </Link>

            {/* Option 4: Other Color */}
            <Link to="/result" className="bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-slate-100 rounded-xl p-8 flex flex-col items-center text-center transition-all group shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p2ef76100} fill="currentColor" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Other Color</h3>
              <p className="text-slate-600 text-sm">Amber, blue, or cycling</p>
            </Link>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-200 p-6 px-10 flex justify-between items-center w-full">
          <Button variant="ghost" asChild className="flex items-center gap-2 text-slate-700">
            <Link to="/quality">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 9.33333">
                <path d={svgPaths.p306f9a98} fill="currentColor" />
              </svg>
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-medium hidden sm:inline">Need direct assistance?</span>
            <Button variant="link" className="px-0 font-bold">Contact Engineer</Button>
          </div>
        </CardFooter>
      </Card>

      <div className="bg-slate-200/50 border border-slate-200/60 rounded-xl py-3 px-6 flex flex-wrap justify-center gap-6 items-center w-fit mx-auto shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3 text-slate-700">
          <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 10.5 10.5">
            <path d={svgPaths.p215f9a00} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Unit ID: RX-990-22</span>
        </div>
        <div className="w-px h-5 bg-slate-300"></div>
        <div className="flex items-center gap-3 text-slate-700">
          <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 10.5 11.0833">
            <path d={svgPaths.p20854500} fill="currentColor" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Firmware v2.4.1</span>
        </div>
      </div>

    </div>
  );
}
