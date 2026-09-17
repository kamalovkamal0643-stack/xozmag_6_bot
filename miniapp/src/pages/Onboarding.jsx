import { useRef, useState } from 'react';
import { haptic } from '../lib/telegram.js';

const SLIDES = [
  {
    art: ['💡', '🧴', '🔨'],
    tint: '#EFF4FF',
    title: 'Uyda nimadir tugadimi?',
    text: "Lampochka kuydimi yoki kir yuvish kukuni qolmadimi? Kerakli xo'jalik mollarini tezda eshigingizgacha yetkazamiz.",
  },
  {
    art: ['👆', '🛒', '🚚'],
    tint: '#ECFDF3',
    title: 'Bu qanday ishlaydi?',
    steps: ['Tanlang', 'Buyurtma bering', 'Qabul qiling'],
    text: "Omborda nima borligini real vaqtda ko'rasiz — tugagan mahsulotga buyurtma berib qo'ymaysiz.",
  },
  {
    art: ['🏠', '⭐', '🤝'],
    tint: '#FFF7ED',
    title: '10 000+ oila biz bilan',
    text: "Sifatli mahsulot, halol narx va kafolat. Siz ham qo'shiling!",
  },
];

export default function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    haptic('light');
    if (isLast) onDone();
    else setIndex(index + 1);
  };

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (delta < -50 && !isLast) setIndex(index + 1);
    if (delta > 50 && index > 0) setIndex(index - 1);
    touchX.current = null;
  };

  return (
    <div className="onboarding" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="onb-top">
        {!isLast && (
          <button className="link-btn" onClick={onDone}>
            O'tkazib yuborish
          </button>
        )}
      </div>

      <div className="onb-slide" key={index}>
        <div className="onb-art" style={{ background: slide.tint }}>
          {slide.art.map((emoji, i) => (
            <span key={emoji} className={`onb-emoji onb-emoji-${i}`}>
              {emoji}
            </span>
          ))}
        </div>

        <h1 className="onb-title">{slide.title}</h1>

        {slide.steps && (
          <div className="onb-steps">
            {slide.steps.map((step, i) => (
              <span key={step} className="onb-step">
                <b>{i + 1}</b>
                {step}
              </span>
            ))}
          </div>
        )}

        <p className="onb-text">{slide.text}</p>
      </div>

      <div className="onb-bottom">
        <div className="dots">
          {SLIDES.map((s, i) => (
            <span key={s.title} className={i === index ? 'active' : ''} />
          ))}
        </div>
        <button className="btn btn-primary btn-block btn-xl" onClick={next}>
          {isLast ? 'Boshlash' : 'Keyingi'}
        </button>
      </div>
    </div>
  );
}
