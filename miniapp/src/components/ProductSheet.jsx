import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { money, discountPercent, stockState, descriptionLines } from '../lib/format.js';
import { onBackButton, haptic } from '../lib/telegram.js';
import { ProductImage, QtyStepper } from './Common.jsx';

export default function ProductSheet({ product }) {
  const { closeProduct, addToCart, cart } = useApp();
  const [closing, setClosing] = useState(false);
  const inCart = cart.find((item) => item.id === product.id)?.quantity || 0;
  const available = Math.max(product.stock - inCart, 0);
  const [qty, setQty] = useState(available > 0 ? 1 : 0);

  const discount = discountPercent(product);
  const stock = stockState(product);
  const features = descriptionLines(product.description);

  const close = () => {
    setClosing(true);
    setTimeout(closeProduct, 200);
  };

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const off = onBackButton(close);
    return () => {
      document.body.classList.remove('no-scroll');
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (qty < 1) return;
    if (addToCart(product, qty)) {
      haptic('medium');
      close();
    }
  };

  return (
    <div className={`sheet-overlay ${closing ? 'closing' : ''}`} onClick={close}>
      <section className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={close} aria-label="Yopish">
          ✕
        </button>

        <div className="sheet-scroll">
          <div className="sheet-hero">
            <ProductImage product={product} className="pimg-large" />
            {discount > 0 && <span className="badge badge-red sheet-discount">−{discount}% chegirma</span>}
          </div>

          <div className="sheet-content">
            {product.category && (
              <span className="sheet-category">
                {product.category.emoji} {product.category.name}
              </span>
            )}
            <h2 className="sheet-title">{product.name}</h2>

            <div className="sheet-prices">
              <b className={`price-lg ${product.oldPrice ? 'price-sale' : ''}`}>{money(product.price)}</b>
              {product.oldPrice && <s className="price-old">{money(product.oldPrice)}</s>}
              <span className="price-unit">/ 1 {product.unit}</span>
            </div>

            <div className={`stock-line tone-${stock.tone}`}>
              <span className="dot" />
              {stock.long}
            </div>

            {features.length > 0 && (
              <>
                <h3 className="sheet-subtitle">Xususiyatlari</h3>
                <ul className="bullets">
                  {features.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="sheet-meta">
              <span>Artikul: {product.sku}</span>
              {inCart > 0 && <span>Savatchada: {inCart} {product.unit}</span>}
            </div>
          </div>
        </div>

        <div className="sheet-cta">
          {available > 0 ? (
            <>
              <div className="sheet-qty">
                <span>Miqdori</span>
                <QtyStepper size="sm" value={qty} max={available} onChange={(v) => setQty(Math.max(1, Math.min(v, available)))} />
              </div>
              <button className="btn btn-primary btn-block btn-xl" onClick={submit}>
                Savatchaga qo'shish — {money(product.price * qty)}
              </button>
            </>
          ) : (
            <button className="btn btn-disabled btn-block btn-xl" disabled>
              {product.stock <= 0 ? 'Hozircha tugagan' : 'Barcha qoldiq savatchangizda'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
