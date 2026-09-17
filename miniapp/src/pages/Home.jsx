import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import Stories from '../components/Stories.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorState, Spinner } from '../components/Common.jsx';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Xayrli tun';
  if (hour < 12) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

export default function Home() {
  const { user, shop, goToCatalog, cartCount, cartTotal, setTab } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.home());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user?.firstName || 'mehmon';

  return (
    <div className="home">
      <header className="home-header">
        <div className="avatar">{firstName.charAt(0).toUpperCase()}</div>
        <div>
          <p className="muted small">{greeting()} 👋</p>
          <h1 className="home-name">{firstName}</h1>
        </div>
      </header>

      <button className="search-fake" onClick={() => goToCatalog({ focusSearch: true })}>
        <span>🔍</span> Lampa, chelak, kukun...
      </button>

      {data && <Stories stories={data.stories} />}

      <section className="hero">
        <div className="hero-text">
          <span className="hero-kicker">🧺 {shop.name}</span>
          <h2>Yangi buyurtma berish</h2>
          <p>Uy-ro'zg'or va ta'mirlash uchun hamma narsa — eshigingizgacha.</p>
          <button className="btn btn-white" onClick={() => goToCatalog()}>
            Katalogni ochish →
          </button>
        </div>
        <span className="hero-art">🛒</span>
      </section>

      <div className="info-row">
        <div className="info-chip">
          <span>🚚</span>
          <div>
            <b>{money(shop.freeDeliveryFrom)} dan</b>
            <small>bepul yetkazish</small>
          </div>
        </div>
        <div className="info-chip">
          <span>🕘</span>
          <div>
            <b>{shop.workHours}</b>
            <small>har kuni ishlaymiz</small>
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <button className="cart-reminder" onClick={() => setTab('cart')}>
          <span>🛒 Savatchada {cartCount} ta mahsulot</span>
          <b>{money(cartTotal)} →</b>
        </button>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <div className="section-head">
            <h3>Kategoriyalar</h3>
          </div>
          <div className="cat-grid">
            {data.categories.map((cat) => (
              <button key={cat.id} className="cat-tile" onClick={() => goToCatalog({ category: cat.slug })}>
                <span className="cat-emoji">{cat.emoji}</span>
                <span className="cat-name">{cat.name}</span>
              </button>
            ))}
          </div>

          {data.popular.length > 0 && (
            <>
              <div className="section-head">
                <h3>🔥 Ko'p sotilayotganlar</h3>
                <button className="link-btn" onClick={() => goToCatalog()}>
                  Barchasi
                </button>
              </div>
              <div className="hscroll product-row">
                {data.popular.map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
