const storyPreviews = [
  {title: '故事会精选', detail: '听歌之外，也留一点故事的位置。'},
  {title: '最近更新', detail: '新故事正在认真准备。'},
  {title: '时间轴', detail: '沿着时间重温熟悉的声音。'},
];

export function StoryPreview() {
  return (
    <section aria-labelledby="story-preview-title" className="story-preview" id="stories">
      <h2 id="story-preview-title">关于 Hanser 的故事</h2>
      <div>
        {storyPreviews.map((story) => (
          <article key={story.title}>
            <h3>{story.title}</h3>
            <p>{story.detail}</p>
            <p>尚未开放</p>
          </article>
        ))}
      </div>
    </section>
  );
}
