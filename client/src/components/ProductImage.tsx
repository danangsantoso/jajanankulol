import { JajanankuLogoMark } from "@/components/AppBrand";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

function ProductImageFallback({ alt, className }: { alt: string; className?: string }) {
  return <div role="img" aria-label={alt} className={cn("grid place-items-center bg-secondary p-[18%]", className)}><JajanankuLogoMark className="drop-shadow-sm" /></div>;
}

export function ProductImage({ src, alt, className, imageClassName }: { src?: string | null; alt: string; className?: string; imageClassName?: string }) {
  const [retry, setRetry] = useState(0);
  const [useFallback, setUseFallback] = useState(!src);

  useEffect(() => {
    setRetry(0);
    setUseFallback(!src);
  }, [src]);

  if (!src || useFallback) return <ProductImageFallback alt={alt} className={className} />;

  const imageSrc = `${src}${src.includes("?") ? "&" : "?"}image_attempt=${retry}`;
  return <div className={cn("overflow-hidden bg-secondary", className)}><img key={imageSrc} src={imageSrc} alt={alt} loading="lazy" decoding="async" onError={() => retry === 0 ? setRetry(1) : setUseFallback(true)} className={cn("h-full w-full object-cover", imageClassName)} /></div>;
}
