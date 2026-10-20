import {useState} from 'react';

type MediaImageProps = {alt: string; className?: string; fallbackLabel: string; src?: string};
export function MediaImage({alt, className, fallbackLabel, src}: MediaImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && failedSrc !== src) {
    return <img alt={alt} className={className} onError={() => setFailedSrc(src)} src={src} />;
  }
  return <div aria-hidden={alt.length === 0 ? true : undefined}
    aria-label={alt.length ? `${fallbackLabel} 默认封面` : undefined}
    className={['media-image__fallback', className].filter(Boolean).join(' ')} role={alt.length ? 'img' : undefined}>
    <img alt="" src="/brand/fallback-cover.svg" onError={(event) => {event.currentTarget.hidden = true;}} />
  </div>;
}
