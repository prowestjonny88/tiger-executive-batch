import { AnnotatedImage, type Annotation } from "../ui/annotated-image";

interface EvidencePanelProps {
  imageUrl: string | null | undefined;
  annotations?: Annotation[];
}

export function EvidencePanel({ imageUrl, annotations = [] }: EvidencePanelProps) {
  const uniqueLabels = Array.from(new Set(annotations.map((annotation) => annotation.label).filter(Boolean)));

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
        <AnnotatedImage src={imageUrl} annotations={annotations} className="max-h-[500px] w-auto object-contain rounded-lg" />
      </div>
      {uniqueLabels.length > 0 && (
        <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
          {uniqueLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-4 text-center">
        {annotations.length > 0
          ? "Detected components used for visual assessment. Clearer close-ups may be required for label verification."
          : "No visual boxes returned. The image was still used for VLM assessment."}
      </p>
    </div>
  );
}
