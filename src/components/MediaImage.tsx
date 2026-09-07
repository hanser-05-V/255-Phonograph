import {useState} from 'react';

type MediaImageProps = {
  alt: string;
  className?: string;
  fallbackLabel: string;
  src?: string;
};

export function MediaImage({alt, className, fallbackLabel, src}: MediaImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  if (!showFallback) {
    return (
      <img
        alt={alt}
        className={className}
        onError={() => setFailedSrc(src)}
        src={src}
      />
    );
  }

  return (
    <div
      aria-hidden={alt.length === 0 ? true : undefined}
      aria-label={alt.length > 0 ? `${fallbackLabel} 默认封面` : undefined}
      className={['media-image__fallback', className].filter(Boolean).join(' ')}
      role={alt.length > 0 ? 'img' : undefined}
    >
      {alt.length > 0 ? (
        <>
          <span aria-hidden="true">{fallbackLabel.slice(0, 1)}</span>
          <small aria-hidden="true">255</small>
        </>
      ) : null}
    </div>
  );
}
