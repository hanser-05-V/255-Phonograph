type ArtworkKind = 'rabbit' | 'hug' | 'heart' | 'cheer' | 'portrait';
const crops = {
  rabbit: '0 300 1057 740', hug: '366 1752 288 296',
  heart: '300 2840 140 150', cheer: '480 2845 140 125',
};

export function HanserArtwork({kind, className = '', label}: {
  kind: ArtworkKind; className?: string; label?: string;
}) {
  if (kind === 'portrait') {
    return <img alt={label ?? ''} className={`hanser-art ${className}`} src="/brand/hanser-main.png" width={600} height={600} />;
  }
  return (
    <svg aria-hidden={label ? undefined : true} aria-label={label} className={`hanser-art ${className}`}
      focusable="false" role={label ? 'img' : undefined} viewBox={crops[kind]}>
      <image href="/brand/hanser-chibi.png" width="1057" height="10800" />
    </svg>
  );
}

export function RecordMark() {
  return <svg aria-hidden="true" className="brand-record" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4">
    <circle cx="20" cy="20" r="17" /><circle cx="20" cy="20" r="5" />
    <path d="M9 20a11 11 0 0 1 11-11M31 20a11 11 0 0 1-11 11" />
  </svg>;
}
