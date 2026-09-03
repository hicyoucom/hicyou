"use client";

import { useState, type CSSProperties } from "react";

import { normalizePublicImageSource } from "@/lib/image-source";

interface SafeExternalImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
}

export function SafeExternalImage({
  src,
  alt = "",
  className,
  style,
  width,
  height,
}: SafeExternalImageProps) {
  const safeSource = normalizePublicImageSource(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!safeSource || failedSource === safeSource) return null;

  return (
    // Bookmark media can originate from arbitrary HTTPS publishers, which
    // cannot be safely enumerated in Next/Image's remotePatterns allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={safeSource}
      src={safeSource}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      style={style}
      width={width}
      height={height}
      onError={() => setFailedSource(safeSource)}
    />
  );
}
