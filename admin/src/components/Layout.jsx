import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, session } from '../lib/api.js';
import { Toaster, toast } from './ui.jsx';

const NAV = [
  { to: '/', icon: '📊', label: 'Dashboard', end: true },
  { to: '/orders', icon: '🧾', label: 'Buyurtmalar', badge: true },
  { to: '/products', icon: '📦', label: 'Mahsulotlar' },
  { to: '/stock', icon: '🔄', label: 'Ombor harakati' },
  { to: '/categories', icon: '🏷️', label: 'Kategoriyalar' },
  { to: '/customers', icon: '👥', label: 'Mijozlar' },
];

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* audio mavjud emas */
  }
}

export default function Layout() {
  const navigate = useNavigate();
  const [newCount, setNewCount] = useState(0);
  const lastTotal = useRef(null);

  const checkNewOrders = useCallback(async () => {
    try {
      const data = await api.orders({ status: 'NEW', pageSize: 5 });
      if (lastTotal.current !== null && data.total > lastTotal.current) {
        beep();
        toast(`🔔 Yangi buyurtma! #${data.orders[0]?.number || ''}`, 'blue');
        window.dispatchEvent(new Event('hz:new-order'));
      }
      lastTotal.current = data.total;
      setNewCount(data.total);
    } catch {
      /* keyingi urinishda */
    }
  }, []);

  useEffect(() => {
    checkNewOrders();
    const timer = setInterval(checkNewOrders, 15000);
    window.addEventListener('hz:orders-changed', checkNewOrders);
    return () => {
      clearInterval(timer);
      window.removeEventListener('hz:orders-changed', checkNewOrders);
    };
  }, [checkNewOrders]);

  useEffect(() => {
    document.title = newCount ? `(${newCount}) Hozmagazin Admin` : 'Hozmagazin Admin';
  }, [newCount]);

  const logout = () => {
    session.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">🧺</span>
          <div>
            <b>Hozmagazin</b>
            <small>Boshqaruv paneli</small>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
              {item.badge && newCount > 0 && <span className="nav-badge">{newCount}</span>}
            </NavLink>
          ))}
        </nav>

        <button className="nav-link logout" onClick={logout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-text">Chiqish</span>
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
