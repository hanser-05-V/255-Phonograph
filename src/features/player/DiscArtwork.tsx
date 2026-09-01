type DiscArtworkProps = {
  coverUrl?: string;
  isPlaying: boolean;
  title: string;
};

function CoverImage({coverUrl, title}: Pick<DiscArtworkProps, 'coverUrl' | 'title'>) {
  if (coverUrl) {
    return <img alt={`${title} 封面`} src={coverUrl} />;
  }

  return (
    <div aria-label={`${title} 封面`} className="disc-artwork__fallback" role="img">
      <span>{title.slice(0, 1)}</span>
      <small>255</small>
    </div>
  );
}

export function DiscArtwork({coverUrl, isPlaying, title}: DiscArtworkProps) {
  return (
    <div className="disc-artwork">
      <div
        aria-hidden="true"
        className="disc"
        data-playing={String(isPlaying)}
        data-testid="disc"
      >
        <div className="disc__surface">
          {coverUrl ? (
            <img alt="" className="disc__art" src={coverUrl} />
          ) : (
            <div className="disc__art disc__art--fallback" />
          )}
          <div className="disc__grooves" />
          <div className="disc__reflection" />
        </div>
        <div className="disc__center-ring" />
      </div>

      <div className="disc-artwork__cover">
        <CoverImage coverUrl={coverUrl} title={title} />
        <div aria-hidden="true" className="disc-artwork__glass" />
      </div>
    </div>
  );
}
