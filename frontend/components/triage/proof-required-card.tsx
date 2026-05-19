import { AlertCircle } from "lucide-react";
import type { ResultProofState } from "../../lib/theme2-result-state";

interface ProofRequiredCardProps {
  proofNext: string | null | undefined;
  prompts: { question_id?: string; prompt: string }[];
  suppressGenericEvdbProof?: boolean;
  resultProofState?: ResultProofState;
}

function isGenericEvdbProof(prompt: string | null | undefined) {
  if (!prompt) return false;
  if (/burn|smoke|spark|melt|hot|water|exposed|stop using|safety/i.test(prompt)) return false;
  return /EVDB|MCB|RCCB|breaker|pole|Type A/i.test(prompt) && /close|clear|readable|label|proof|photo/i.test(prompt);
}

export function ProofRequiredCard({
  proofNext,
  prompts,
  suppressGenericEvdbProof = false,
  resultProofState,
}: ProofRequiredCardProps) {
  const shouldHideGenericEvdbProof = suppressGenericEvdbProof || resultProofState === "verified";
  const visibleProofNext =
    shouldHideGenericEvdbProof && isGenericEvdbProof(proofNext) ? null : proofNext;
  const visiblePrompts = shouldHideGenericEvdbProof
    ? prompts.filter((prompt) => prompt.question_id !== "evdb_label_closeup")
    : prompts;

  if (!visibleProofNext && visiblePrompts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <strong className="text-amber-800 text-sm font-bold uppercase tracking-widest">
          Verification Required
        </strong>
      </div>
      {visibleProofNext && <p className="text-amber-900 font-medium mb-2">{visibleProofNext}</p>}
      {visiblePrompts.length > 0 && (
        <ul className="list-disc pl-5 text-amber-800 space-y-1 text-sm mt-2">
          {visiblePrompts.map((p, i) => (
            <li key={i}>{p.prompt}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
