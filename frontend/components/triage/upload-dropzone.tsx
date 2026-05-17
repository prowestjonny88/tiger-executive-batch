"use client";

import { UploadCloud } from "lucide-react";
import { useRef } from "react";
import { cn } from "../../lib/utils";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
  className?: string;
}

export function UploadDropzone({ onFileSelect, fileName, className }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={cn(
        "bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center min-h-[200px] p-8 relative transition-colors hover:bg-slate-100 hover:border-green-500 group cursor-pointer",
        className
      )}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="bg-white text-green-700 w-16 h-16 flex flex-col items-center justify-center rounded-2xl mb-4 group-hover:bg-green-50 transition-all shadow-sm group-hover:scale-110">
        <UploadCloud className="w-8 h-8 transition-transform" />
      </div>
      
      {fileName ? (
        <p className="font-bold text-slate-900 text-base mb-1">{fileName}</p>
      ) : (
        <>
          <p className="font-semibold text-slate-900 text-lg mb-1">Tap to capture or upload</p>
          <p className="text-slate-500 text-sm">JPEG, PNG up to 10MB</p>
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
