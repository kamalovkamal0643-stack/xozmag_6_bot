import { useState } from 'react';

export function Spinner({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ emoji = '📦', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      emoji="🔌"
      title="Ulanishda xatolik"
      text={message}
      action={
        onRetry && (
          <button className="btn btn-soft" onClick={onRetry}>
            Qayta urinish
          </button>
        )
      }
    />
  );
}

export function QtyStepper({ value, max, onChange, size = 'md' }) {
  return (
    <div className={`stepper stepper-${size}`}>
      <button type="button" aria-label="Kamaytirish" onClick={() => onChange(value - 1)}>
        −
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Ko'paytirish" disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false);
  const showImage = product.imageUrl && !failed;
  return (
    <div className={`pimg ${className}`}>
      {showImage ? (
        <img src={product.imageUrl} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="pimg-emoji">{product.emoji || '📦'}</span>
      )}
    </div>
  );
}

export function Toast({ text, tone }) {
  return <div className={`toast toast-${tone}`}>{text}</div>;
}
