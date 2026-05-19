"use client";

import { useState } from "react";

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
  className = "",
}: {
  src: string;
  alt?: string;
  annotations?: Annotation[];
  className?: string;
}) {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const orderedAnnotations = [...annotations].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });

  // Use placehold.co if image doesn't exist
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm w-full h-[300px] ${className}`}>
      {/* Fallback to simple img tag for generic support, but can use next/image if configured */}
      <img
        src={imgSrc}
        alt={alt}
        className="object-contain w-full h-full"
        onError={() => setImgSrc("https://placehold.co/600x400/e2e8f0/475569?text=Image+Not+Found")}
      />

      {/* Render bounding boxes */}
      {orderedAnnotations.map((ann) => {
        const labelAbove = ann.y + ann.height > 84;
        const isHovered = hoveredAnnotation === ann.id;
        return (
          <div
            key={ann.id}
            className={`absolute border-2 transition-colors duration-200 cursor-pointer ${
              isHovered
                ? "border-red-500 bg-red-500/20"
                : "border-amber-400 bg-amber-400/10 hover:border-red-500 hover:bg-red-500/20"
            }`}
            style={{
              left: `${ann.x}%`,
              top: `${ann.y}%`,
              width: `${ann.width}%`,
              height: `${ann.height}%`,
            }}
            onMouseEnter={() => setHoveredAnnotation(ann.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
            onFocus={() => setHoveredAnnotation(ann.id)}
            onBlur={() => setHoveredAnnotation(null)}
            tabIndex={0}
            aria-label={`Detected ${ann.label}`}
          >
            {(isHovered || annotations.length === 1) && (
              <div
                className={`absolute left-0 z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md ${
                  labelAbove ? "-top-7" : "-bottom-7"
                }`}
              >
                {ann.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
