import { useEffect, useState } from 'react';
import { ORDER_STATUS } from '../lib/format.js';

const toastListeners = new Set();

export const toast = (text, tone = 'dark') => {
  const item = { id: `${Date.now()}-${Math.random()}`, text, tone };
  toastListeners.forEach((listener) => listener(item));
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const listener = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3500);
    };
    toastListeners.add(listener);
    return () => toastListeners.delete(listener);
  }, []);

  return (
    <div className="toaster">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.tone}`}>
          {item.text}
        </div>
      ))}
    </div>
  );
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status];
  return (
    <Badge tone={s.tone}>
      {s.icon} {s.label}
    </Badge>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, trend, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        {trend !== null && trend !== undefined && (
          <span className={`trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Spinner({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" /> {label}
    </div>
  );
}

export function Empty({ icon = '📭', text }) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="error-box">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button className="btn btn-light btn-sm" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function BarChart({ data, format = (v) => v, height = 200, accentLast = true }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="bar-col" title={`${d.label}: ${format(d.value)}`}>
          <span className="bar-value">{d.value ? d.short ?? format(d.value) : ''}</span>
          <div className="bar-track">
            <div
              className={`bar ${accentLast && i === data.length - 1 ? 'bar-accent' : ''}`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value ? 3 : 0)}%` }}
            />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductThumb({ product, size = 40 }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="thumb" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {product.imageUrl && !failed ? (
        <img src={product.imageUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        product.emoji || '📦'
      )}
    </span>
  );
}
