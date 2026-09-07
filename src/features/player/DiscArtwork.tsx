import {MediaImage} from '../../components/MediaImage';

type DiscArtworkProps = {
  coverUrl?: string;
  isPlaying: boolean;
  title: string;
};

export function DiscArtwork({coverUrl, isPlaying, title}: DiscArtworkProps) {
  return (
    <div className="disc-artwork">
      <div className="disc-artwork__disc-positioner" data-testid="disc-positioner">
        <div
          aria-hidden="true"
          className="disc"
          data-playing={String(isPlaying)}
          data-testid="disc"
        >
          <div className="disc__surface">
            <MediaImage
              alt=""
              className="disc__art"
              fallbackLabel={title}
              src={coverUrl}
            />
            <div className="disc__grooves" />
            <div className="disc__reflection" />
          </div>
          <div className="disc__center-ring" />
        </div>
      </div>

      <div className="disc-artwork__cover">
        <MediaImage
          alt={`${title} 封面`}
          fallbackLabel={title}
          src={coverUrl}
        />
        <div aria-hidden="true" className="disc-artwork__glass" />
      </div>
    </div>
  );
}
