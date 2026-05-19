"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { AnnotatedImage, type Annotation } from "../ui/annotated-image";

export function EvidenceDialog({
  imageUrl,
  annotations,
  children,
}: {
  imageUrl: string;
  annotations: Annotation[];
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Highlighted evidence</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl bg-slate-950 p-4">
          <AnnotatedImage src={imageUrl} annotations={annotations} className="max-h-[78vh] w-full object-contain rounded-xl" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
