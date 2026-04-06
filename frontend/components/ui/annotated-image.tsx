"use client";

import { useState } from "react";
import Image from "next/image";

export type Annotation = {
  id: string;
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  width: number; // percentage width
  height: number; // percentage height
  label: string;
};

export function AnnotatedImage({
  src,
  alt = "Incident Photo",
  annotations = [],
}: {
  src: string;
  alt?: string;
  annotations?: Annotation[];
}) {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);

  // Use placehold.co if image doesn't exist
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm w-full h-[300px]">
      {/* Fallback to simple img tag for generic support, but can use next/image if configured */}
      <img
        src={imgSrc}
        alt={alt}
        className="object-contain w-full h-full"
        onError={() => setImgSrc("https://placehold.co/600x400/e2e8f0/475569?text=Image+Not+Found")}
      />

      {/* Render bounding boxes */}
      {annotations.map((ann) => (
        <div
          key={ann.id}
          className={`absolute border-2 transition-colors duration-200 cursor-pointer ${
            hoveredAnnotation === ann.id
              ? "border-red-500 bg-red-500/20"
              : "border-amber-400 bg-amber-400/10"
          }`}
          style={{
            left: `${ann.x}%`,
            top: `${ann.y}%`,
            width: `${ann.width}%`,
            height: `${ann.height}%`,
          }}
          onMouseEnter={() => setHoveredAnnotation(ann.id)}
          onMouseLeave={() => setHoveredAnnotation(null)}
        >
          {(hoveredAnnotation === ann.id || annotations.length === 1) && (
            <div className="absolute -bottom-7 left-0 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md z-10">
              {ann.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
