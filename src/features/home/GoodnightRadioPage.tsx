import {Link} from 'react-router-dom';
import {HanserArtwork} from '../../components/HanserArtwork';
import {HomeHeader} from './HomeHeader';

export function GoodnightRadioPage() {
  return <main aria-labelledby="radio-page-title" className="radio-page page-with-mini-player">
    <HomeHeader showSearch={false} />
    <section className="radio-intro">
      <div><Link className="back-home" to="/">返回首页</Link>
        <h1 id="radio-page-title" tabIndex={-1}>晚安电台</h1>
        <p className="radio-intro__lead">读一段文字，道一声晚安。</p>
        <p>这里是留音机的读书企划。给一天留一点安静，也给故事留一盏灯。</p>
      </div>
      <HanserArtwork kind="portrait" label="蓝白水手服的 hanser" />
    </section>
    <section aria-labelledby="radio-videos-title" className="radio-videos">
      <h2 id="radio-videos-title">读书视频</h2>
      <div className="radio-empty"><HanserArtwork kind="hug" />
        <div><h3>第一段晚安，正在准备。</h3><p>读书视频会陆续放在这里。在这之前，先让喜欢的歌陪你一会儿。</p>
          <Link className="public-text-link" to="/music">去音乐馆听听</Link>
        </div>
      </div>
    </section>
  </main>;
}
