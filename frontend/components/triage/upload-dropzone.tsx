"use client";

import { ImagePlus, RefreshCw, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

function formatFileSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone({
  onFileSelect,
  fileName,
  fileSize,
  previewUrl,
  className,
  title = "Tap to capture or upload",
  subtitle = "JPEG, PNG, or WEBP up to 10MB",
  compact = false,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-2xl relative transition-colors group cursor-pointer overflow-hidden",
        compact ? "min-h-[150px] p-5" : "min-h-[220px] p-6 md:p-8",
        dragging ? "border-green-500 bg-green-50" : "bg-slate-50 border-slate-300 hover:bg-slate-100 hover:border-green-500",
        className
      )}
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onClick={() => fileInputRef.current?.click()}
    >
      {previewUrl ? (
        <div className="grid w-full gap-4 md:grid-cols-[160px_1fr] md:items-center">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={previewUrl} alt="Selected evidence preview" className="aspect-[4/3] h-full w-full object-cover" />
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-green-700">
              <ImagePlus className="size-4" />
              Photo selected
            </p>
            <p className="break-all text-base font-extrabold text-slate-950">{fileName}</p>
            {fileSize ? <p className="mt-1 text-sm font-semibold text-slate-500">{formatFileSize(fileSize)}</p> : null}
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-700">
              <RefreshCw className="size-4" />
              Replace photo
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white text-green-700 w-16 h-16 flex flex-col items-center justify-center rounded-2xl mb-4 group-hover:bg-green-50 transition-all shadow-sm group-hover:scale-105">
            <UploadCloud className="w-8 h-8 transition-transform" />
          </div>
          <p className="font-extrabold text-slate-900 text-lg mb-1 text-center">{title}</p>
          <p className="text-slate-500 text-sm text-center">{subtitle}</p>
          <p className="mt-3 text-xs font-semibold text-slate-400 text-center">Mobile camera upload is supported.</p>
        </>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />
    </div>
  );
}
