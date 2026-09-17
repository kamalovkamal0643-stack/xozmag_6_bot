import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/format.js';
import { onBackButton } from '../lib/telegram.js';

const SEEN_KEY = 'hz_seen_stories';
const DURATION = 5000;

function StoryViewer({ stories, startIndex, onClose, onSeen }) {
  const [index, setIndex] = useState(startIndex);
  const story = stories[index];

  useEffect(() => {
    onSeen(story.id);
    const timer = setTimeout(() => {
      if (index < stories.length - 1) setIndex(index + 1);
      else onClose();
    }, DURATION);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => onBackButton(onClose), [onClose]);

  const tap = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const goBack = event.clientX - rect.left < rect.width / 3;
    if (goBack) setIndex(Math.max(0, index - 1));
    else if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  };

  return (
    <div className="story-viewer" style={{ '--story-color': story.color }} onClick={tap}>
      <div className="story-progress">
        {stories.map((s, i) => (
          <span key={s.id} className={i < index ? 'done' : i === index ? 'active' : ''}>
            <i key={i === index ? `a-${index}` : s.id} />
          </span>
        ))}
      </div>
      <button
        className="story-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Yopish"
      >
        ✕
      </button>
      <div className="story-body">
        <div className="story-emoji">{story.emoji}</div>
        <span className="story-kicker">{story.subtitle}</span>
        <h2>{story.title}</h2>
        <p>{story.text}</p>
      </div>
    </div>
  );
}

export default function Stories({ stories }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [seen, setSeen] = useState(() => storage.get(SEEN_KEY, []));
  const closeViewer = useCallback(() => setOpenIndex(null), []);

  const markSeen = (id) =>
    setSeen((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      storage.set(SEEN_KEY, next);
      return next;
    });

  if (!stories?.length) return null;

  return (
    <>
      <div className="stories hscroll">
        {stories.map((story, i) => (
          <button key={story.id} className={`story ${seen.includes(story.id) ? 'seen' : ''}`} onClick={() => setOpenIndex(i)}>
            <span className="story-ring">
              <span className="story-circle" style={{ background: story.color }}>
                {story.emoji}
              </span>
            </span>
            <span className="story-title">{story.title}</span>
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <StoryViewer stories={stories} startIndex={openIndex} onSeen={markSeen} onClose={closeViewer} />
      )}
    </>
  );
}
