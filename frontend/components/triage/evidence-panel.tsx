import { AnnotatedImage } from "../ui/annotated-image";

interface EvidencePanelProps {
  imageUrl: string | null | undefined;
}

export function EvidencePanel({ imageUrl }: EvidencePanelProps) {
  if (!imageUrl) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
        <p className="text-slate-500 font-medium">No uploaded evidence available.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
      <div className="w-full h-full relative aspect-video md:aspect-square lg:aspect-auto flex items-center justify-center">
        <AnnotatedImage src={imageUrl} annotations={[]} className="max-h-[500px] w-auto object-contain rounded-lg" />
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        Uploaded evidence used for visual assessment
      </p>
    </div>
  );
}
