import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { closeApp, haptic, isInTelegram, requestLocation } from '../lib/telegram.js';
import { EmptyState, ProductImage, QtyStepper, Switch } from '../components/Common.jsx';

const PHONE_RE = /^\+?\d[\d\s()-]{8,18}$/;

export default function Cart() {
  const {
    cart,
    cartTotal,
    shop,
    user,
    updateCart,
    toCartItem,
    setQuantity,
    removeFromCart,
    clearCart,
    addToCart,
    goToCatalog,
    setTab,
    showToast,
    refreshProfile,
  } = useApp();

  const [upsell, setUpsell] = useState(null);
  const [form, setForm] = useState({ phone: '', address: '', comment: '', paymentType: 'CASH' });
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, phone: f.phone || user.phone || '', address: f.address || user.address || '' }));
  }, [user]);

  const syncWithServer = useCallback(async () => {
    const ids = cart.map((item) => item.id);
    if (!ids.length) return;
    try {
      const products = await api.syncCart(ids);
      const byId = new Map(products.map((p) => [p.id, p]));
      const notes = [];
      updateCart((prev) =>
        prev.flatMap((item) => {
          const p = byId.get(item.id);
          if (!p || !p.isActive || p.stock <= 0) {
            notes.push(`${item.name} tugadi`);
            return [];
          }
          const quantity = Math.min(item.quantity, p.stock);
          if (quantity < item.quantity) notes.push(`${item.name}: faqat ${p.stock} ${p.unit}`);
          else if (p.price !== item.price) notes.push(`${item.name}: narx yangilandi`);
          return [toCartItem(p, quantity)];
        })
      );
      if (notes.length) showToast(`Savatcha yangilandi — ${notes.join('; ')}`, 'amber');
    } catch {
      /* tarmoq xatosida eski ma'lumot qoladi */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  useEffect(() => {
    syncWithServer();
    if (cart.length) api.upsell(cart.map((item) => item.id)).then(setUpsell).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const detectLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const loc = await requestLocation();
      setLocation(loc);
      haptic('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const deliveryFee = cartTotal >= shop.freeDeliveryFrom ? 0 : shop.deliveryFee;
  const total = cartTotal + deliveryFee;
  const leftForFree = Math.max(0, shop.freeDeliveryFrom - cartTotal);
  const progress = Math.min(100, Math.round((cartTotal / Math.max(shop.freeDeliveryFrom, 1)) * 100));
  const belowMin = cartTotal < shop.minOrder;
  const upsellInCart = Boolean(upsell && cart.some((item) => item.id === upsell.id));

  const submit = async () => {
    setError('');
    if (belowMin) return setError(`Minimal buyurtma summasi — ${money(shop.minOrder)}`);
    if (!PHONE_RE.test(form.phone.trim())) return setError("Telefon raqamini to'g'ri kiriting, masalan: +998 90 123 45 67");
    if (!form.address.trim() && !location) return setError('Manzilni yozing yoki joylashuvni yuboring');

    setSubmitting(true);
    haptic('medium');
    try {
      const order = await api.createOrder({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        phone: form.phone.trim(),
        address: form.address.trim(),
        comment: form.comment.trim(),
        paymentType: form.paymentType,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      clearCart();
      haptic('success');
      setSuccess(order);
      refreshProfile();
      if (isInTelegram()) setTimeout(closeApp, 2500);
    } catch (err) {
      haptic('error');
      setError(err.message);
      syncWithServer();
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="success">
        <div className="success-icon">✅</div>
        <h2>Buyurtma qabul qilindi!</h2>
        <p>
          Buyurtma raqami: <b>#{success.number}</b>
        </p>
        <b className="success-total">{money(success.total)}</b>
        <p className="muted">Kuryerimiz tez orada siz bilan bog'lanadi. Chek Telegram botga yuborildi 🧾</p>
        {!isInTelegram() && (
          <button className="btn btn-soft" onClick={() => setTab('profile')}>
            Buyurtmalarimni ko'rish
          </button>
        )}
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="cart">
        <h1 className="page-title">Savatcha</h1>
        <EmptyState
          emoji="🛒"
          title="Savatcha hozircha bo'sh"
          text="Katalogdan kerakli mahsulotlarni tanlang — biz tezda yetkazamiz."
          action={
            <button className="btn btn-primary" onClick={() => goToCatalog()}>
              Katalogga o'tish
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="cart with-cta">
      <div className="page-head">
        <h1 className="page-title">Savatcha</h1>
        <button className="link-btn danger" onClick={clearCart}>
          Tozalash
        </button>
      </div>

      <div className="free-delivery">
        {leftForFree > 0 ? (
          <span>
            🚚 Bepul yetkazishga yana <b>{money(leftForFree)}</b> qoldi
          </span>
        ) : (
          <span>
            🎉 <b>Yetkazib berish bepul!</b>
          </span>
        )}
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="cart-list">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <ProductImage product={item} className="pimg-thumb" />
            <div className="cart-item-body">
              <div className="cart-item-top">
                <h4>{item.name}</h4>
                <button className="icon-btn" onClick={() => removeFromCart(item.id)} aria-label="O'chirish">
                  ✕
                </button>
              </div>
              <span className="muted small">
                {money(item.price)} / {item.unit}
                {item.stock <= item.minStock && ` · ${item.stock} ta qoldi`}
              </span>
              <div className="cart-item-bottom">
                <QtyStepper size="sm" value={item.quantity} max={item.stock} onChange={(v) => setQuantity(item.id, v)} />
                <b>{money(item.price * item.quantity)}</b>
              </div>
            </div>
          </div>
        ))}
      </div>

      {upsell && (
        <div className="upsell">
          <ProductImage product={upsell} className="pimg-thumb" />
          <p>
            Bunga qo'shimcha ravishda <b>{upsell.name}</b> ni atigi <b className="price-sale">{money(upsell.price)}</b> ga qo'shasizmi?
          </p>
          <Switch checked={upsellInCart} onChange={(on) => (on ? addToCart(upsell, 1, { silent: true }) : removeFromCart(upsell.id))} />
        </div>
      )}

      <section className="card form">
        <h3 className="card-title">Yetkazib berish</h3>

        <label className="field">
          <span>Telefon raqam</span>
          <input type="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={setField('phone')} />
        </label>

        <label className="field">
          <span>Manzil</span>
          <textarea rows={2} placeholder="Tuman, ko'cha, uy, xonadon" value={form.address} onChange={setField('address')} />
        </label>

        <button type="button" className={`btn btn-soft btn-block ${location ? 'btn-success-soft' : ''}`} onClick={detectLocation} disabled={locating}>
          {locating ? 'Aniqlanmoqda...' : location ? '📍 Joylashuv qo\'shildi ✓' : '📍 Joylashuvni yuborish'}
        </button>

        <label className="field">
          <span>Izoh (ixtiyoriy)</span>
          <input placeholder="Masalan: 3-qavat, domofon 25" value={form.comment} onChange={setField('comment')} />
        </label>

        <div className="field">
          <span>To'lov turi</span>
          <div className="segmented">
            {[
              ['CASH', '💵 Naqd'],
              ['CARD', '💳 Karta'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={form.paymentType === value ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, paymentType: value }))}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card summary">
        <div>
          <span>Mahsulotlar</span>
          <span>{money(cartTotal)}</span>
        </div>
        <div>
          <span>Yetkazib berish</span>
          <span>{deliveryFee ? money(deliveryFee) : 'Bepul'}</span>
        </div>
        <div className="summary-total">
          <span>Jami</span>
          <b>{money(total)}</b>
        </div>
        {belowMin && <p className="warn">Minimal buyurtma — {money(shop.minOrder)}</p>}
      </section>

      {error && <div className="alert">{error}</div>}

      <div className="sticky-cta">
        <button className="btn btn-primary btn-block btn-xl" onClick={submit} disabled={submitting}>
          {submitting ? 'Yuborilmoqda...' : `Buyurtmani tasdiqlash · ${money(total)}`}
        </button>
      </div>
    </div>
  );
}
