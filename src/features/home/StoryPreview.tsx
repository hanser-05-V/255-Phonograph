import {Link} from 'react-router-dom';
import {HanserArtwork} from '../../components/HanserArtwork';

export function StoryPreview() {
  return <section aria-labelledby="story-preview-title" className="story-preview" id="stories">
    <HanserArtwork kind="portrait" label="hanser 的日常插画" />
    <div><h2 id="story-preview-title">晚安电台</h2><p>读一段文字，道一声晚安。</p>
      <span>读书企划</span><Link className="public-text-link" to="/goodnight-radio">进入晚安电台</Link>
    </div>
  </section>;
}
