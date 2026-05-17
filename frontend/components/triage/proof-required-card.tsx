import { AlertCircle } from "lucide-react";

interface ProofRequiredCardProps {
  proofNext: string | null | undefined;
  prompts: { prompt: string }[];
}

export function ProofRequiredCard({ proofNext, prompts }: ProofRequiredCardProps) {
  if (!proofNext && prompts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <strong className="text-amber-800 text-sm font-bold uppercase tracking-widest">
          Proof Required Before Action
        </strong>
      </div>
      {proofNext && <p className="text-amber-900 font-medium mb-2">{proofNext}</p>}
      {prompts.length > 0 && (
        <ul className="list-disc pl-5 text-amber-800 space-y-1 text-sm mt-2">
          {prompts.map((p, i) => (
            <li key={i}>{p.prompt}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
