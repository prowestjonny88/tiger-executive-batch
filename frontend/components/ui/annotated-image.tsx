"use client";

import { useState } from "react";
import { useEffect, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const orderedAnnotations = [...annotations].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA;
  });

  // Use placehold.co if image doesn't exist
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const renderedImageRect = (() => {
    if (!naturalSize.width || !naturalSize.height || !containerSize.width || !containerSize.height) {
      return {
        left: 0,
        top: 0,
        width: containerSize.width,
        height: containerSize.height,
      };
    }

    const imageRatio = naturalSize.width / naturalSize.height;
    const containerRatio = containerSize.width / containerSize.height;

    if (containerRatio > imageRatio) {
      const renderedHeight = containerSize.height;
      const renderedWidth = renderedHeight * imageRatio;
      return {
        left: (containerSize.width - renderedWidth) / 2,
        top: 0,
        width: renderedWidth,
        height: renderedHeight,
      };
    }

    const renderedWidth = containerSize.width;
    const renderedHeight = renderedWidth / imageRatio;
    return {
      left: 0,
      top: (containerSize.height - renderedHeight) / 2,
      width: renderedWidth,
      height: renderedHeight,
    };
  })();

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm w-full h-[300px] ${className}`}>
      {/* Fallback to simple img tag for generic support, but can use next/image if configured */}
      <img
        src={imgSrc}
        alt={alt}
        className="object-contain w-full h-full"
        onLoad={(event) => {
          setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
        onError={() => setImgSrc("https://placehold.co/600x400/e2e8f0/475569?text=Image+Not+Found")}
      />

      {/* Render bounding boxes */}
      {orderedAnnotations.map((ann, index) => {
        const labelAbove = ann.y + ann.height > 84;
        const isHovered = hoveredAnnotation === ann.id;
        const left = renderedImageRect.left + (ann.x / 100) * renderedImageRect.width;
        const top = renderedImageRect.top + (ann.y / 100) * renderedImageRect.height;
        const width = (ann.width / 100) * renderedImageRect.width;
        const height = (ann.height / 100) * renderedImageRect.height;
        return (
          <div
            key={ann.id}
            className={`absolute border-2 transition-colors duration-200 cursor-pointer ${
              isHovered
                ? "border-red-500 bg-red-500/20"
                : "border-amber-400 bg-amber-400/10 hover:border-red-500 hover:bg-red-500/20"
            }`}
            style={{
              left,
              top,
              width,
              height,
              zIndex: 10 + index,
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
