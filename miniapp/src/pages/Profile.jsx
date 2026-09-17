import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import { money, formatDate, ORDER_STATUS } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';
import { EmptyState, ErrorState, Spinner } from '../components/Common.jsx';

const LEVELS = [
  { name: 'Yangi mijoz', icon: '🌱', from: 0 },
  { name: 'Bronza', icon: '🥉', from: 300000 },
  { name: 'Kumush', icon: '🥈', from: 1000000 },
  { name: 'Oltin', icon: '🥇', from: 3000000 },
];

const TRACK = ['NEW', 'CONFIRMED', 'DELIVERING', 'DELIVERED'];
const TRACK_LABELS = ['Qabul', 'Tasdiq', "Yo'lda", 'Yetkazildi'];

function levelInfo(spent) {
  const index = LEVELS.reduce((acc, level, i) => (spent >= level.from ? i : acc), 0);
  const next = LEVELS[index + 1];
  const current = LEVELS[index];
  const progress = next ? Math.round(((spent - current.from) / (next.from - current.from)) * 100) : 100;
  return { current, next, progress, left: next ? next.from - spent : 0 };
}

function OrderCard({ order, onReorder, busy }) {
  const [open, setOpen] = useState(false);
  const status = ORDER_STATUS[order.status];
  const step = TRACK.indexOf(order.status);

  return (
    <div className="order-card">
      <button className="order-head" onClick={() => setOpen(!open)}>
        <div>
          <b>#{order.number}</b>
          <small>{formatDate(order.createdAt)}</small>
        </div>
        <span className={`status tone-bg-${status.tone}`}>{status.label}</span>
      </button>

      {step >= 0 && step < 3 && (
        <div className="tracker">
          {TRACK_LABELS.map((label, i) => (
            <div key={label} className={`tracker-step ${i <= step ? 'done' : ''}`}>
              <i />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="order-emojis" onClick={() => setOpen(!open)}>
        {order.items.slice(0, 6).map((item) => (
          <span key={item.id}>{item.emoji}</span>
        ))}
        {order.items.length > 6 && <small>+{order.items.length - 6}</small>}
        <small className="muted">{open ? 'Yopish ▲' : 'Batafsil ▼'}</small>
      </div>

      {open && (
        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <b>{money(item.total)}</b>
            </li>
          ))}
          <li className="muted">
            <span>Yetkazib berish</span>
            <span>{order.deliveryFee ? money(order.deliveryFee) : 'Bepul'}</span>
          </li>
          {order.address && <li className="muted order-address">📍 {order.address}</li>}
        </ul>
      )}

      <div className="order-foot">
        <b>{money(order.total)}</b>
        <button className="btn btn-soft btn-sm" onClick={() => onReorder(order)} disabled={busy}>
          {busy ? '...' : '🔁 Yana shundan buyurtma qilish'}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, stats, shop, updateCart, toCartItem, setTab, showToast, refreshProfile } = useApp();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState({ phone: '', address: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      setOrders(await api.myOrders());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    refreshProfile();
  }, [load, refreshProfile]);

  const reorder = async (order) => {
    setBusyId(order.id);
    try {
      const ids = order.items.map((item) => item.productId).filter(Boolean);
      const products = ids.length ? await api.syncCart(ids) : [];
      const byId = new Map(products.map((p) => [p.id, p]));
      const missing = [];
      let added = 0;

      updateCart((prev) => {
        let next = [...prev];
        for (const item of order.items) {
          const p = byId.get(item.productId);
          if (!p || !p.isActive || p.stock <= 0) {
            missing.push(item.name);
            continue;
          }
          const existing = next.find((c) => c.id === p.id);
          const quantity = Math.min((existing?.quantity || 0) + item.quantity, p.stock);
          next = existing ? next.map((c) => (c.id === p.id ? toCartItem(p, quantity) : c)) : [...next, toCartItem(p, quantity)];
          added += 1;
        }
        return next;
      });

      if (!added) {
        showToast('😔 Bu buyurtmadagi mahsulotlar hozir tugagan', 'red');
        return;
      }
      haptic('success');
      showToast(missing.length ? `Qo'shildi. Tugaganlar: ${missing.join(', ')}` : "✓ Mahsulotlar savatchaga qo'shildi", missing.length ? 'amber' : 'dark');
      setTab('cart');
    } catch (err) {
      showToast(err.message, 'red');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = () => {
    setContact({ phone: user?.phone || '', address: user?.address || '' });
    setEditing(true);
  };

  const saveContact = async () => {
    try {
      await api.updateProfile(contact);
      await refreshProfile();
      setEditing(false);
      showToast("✓ Ma'lumotlar saqlandi");
    } catch (err) {
      showToast(err.message, 'red');
    }
  };

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mijoz';
  const level = levelInfo(stats.totalSpent);

  return (
    <div className="profile">
      <h1 className="page-title">Profil</h1>

      <section className="card profile-card">
        <div className="avatar avatar-lg">{name.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h2>{name}</h2>
          {user?.username && <span className="muted small">@{user.username}</span>}
          <span className="small">{user?.phone || 'Telefon kiritilmagan'}</span>
        </div>
        <button className="link-btn" onClick={editing ? () => setEditing(false) : startEdit}>
          {editing ? 'Bekor' : 'Tahrirlash'}
        </button>
      </section>

      {editing && (
        <section className="card form">
          <label className="field">
            <span>Telefon raqam</span>
            <input type="tel" value={contact.phone} placeholder="+998 90 123 45 67" onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Asosiy manzil</span>
            <textarea rows={2} value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
          </label>
          <button className="btn btn-primary btn-block" onClick={saveContact}>
            Saqlash
          </button>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat">
          <small>Buyurtmalar</small>
          <b>{stats.ordersCount} ta</b>
        </div>
        <div className="stat">
          <small>Jami xaridlar</small>
          <b>{money(stats.totalSpent)}</b>
        </div>
      </div>

      <section className="card level">
        <div className="level-head">
          <span className="level-icon">{level.current.icon}</span>
          <div>
            <small className="muted">Mijoz darajasi</small>
            <b>{level.current.name}</b>
          </div>
        </div>
        <div className="progress">
          <i style={{ width: `${level.progress}%` }} />
        </div>
        <small className="muted">
          {level.next ? `${level.next.icon} ${level.next.name} darajasigacha ${money(level.left)} qoldi` : 'Siz eng yuqori darajadasiz! Rahmat 💛'}
        </small>
      </section>

      <div className="section-head">
        <h3>📜 Mening buyurtmalarim</h3>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!orders && !error && <Spinner />}
      {orders && orders.length === 0 && (
        <EmptyState emoji="🧾" title="Hali buyurtma yo'q" text="Birinchi buyurtmangizni bering — tarix shu yerda saqlanadi." />
      )}
      {orders?.map((order) => (
        <OrderCard key={order.id} order={order} onReorder={reorder} busy={busyId === order.id} />
      ))}

      <section className="card shop-card">
        <h3 className="card-title">🏪 {shop.name}</h3>
        {shop.phone && (
          <a className="shop-line" href={`tel:${shop.phone.replace(/\s/g, '')}`}>
            📞 {shop.phone}
          </a>
        )}
        <span className="shop-line">🕘 {shop.workHours}</span>
        <span className="shop-line">🚚 Yetkazish {money(shop.deliveryFee)}, {money(shop.freeDeliveryFrom)} dan bepul</span>
      </section>

      <p className="version">Hozmagazin Mini App · v1.0</p>
    </div>
  );
}
