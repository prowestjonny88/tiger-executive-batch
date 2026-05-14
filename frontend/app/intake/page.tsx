import Link from "next/link";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

export default function IntakePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <Card className="w-full border-slate-200 p-10 shadow-lg">
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900">Theme 2 Evidence Intake</h1>
        <p className="mx-auto mb-8 max-w-xl text-slate-600">
          The live intake flow now runs through the upload page for charger, EVDB, and isolator evidence.
        </p>
        <Button asChild size="lg" className="h-14 rounded-xl font-bold">
          <Link href="/upload">Start Theme 2 Triage</Link>
        </Button>
      </Card>
    </div>
  );
}
