import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { EmptyState, ErrorState } from '../components/Common.jsx';

export default function Catalog() {
  const { catalogPreset } = useApp();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(catalogPreset.category || '');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    if (catalogPreset.focusSearch) inputRef.current?.focus();
  }, [catalogPreset.focusSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setError('');
    setProducts(null);
    try {
      const list = await api.products({ category, q: query });
      if (id === requestId.current) setProducts(list);
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    }
  }, [category, query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="catalog">
      <div className="catalog-top">
        <h1 className="page-title">Katalog</h1>
        <label className="search">
          <span>🔍</span>
          <input
            ref={inputRef}
            type="search"
            value={search}
            placeholder="Mahsulot nomi yoki artikul"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Tozalash">
              ✕
            </button>
          )}
        </label>

        <div className="chips hscroll">
          <button className={`chip ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>
            Barchasi
          </button>
          {categories.map((cat) => (
            <button key={cat.id} className={`chip ${category === cat.slug ? 'active' : ''}`} onClick={() => setCategory(cat.slug)}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!products && !error && (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pcard skeleton" />
          ))}
        </div>
      )}

      {products && products.length === 0 && (
        <EmptyState emoji="🔎" title="Hech narsa topilmadi" text="Boshqa so'z bilan qidirib ko'ring yoki boshqa kategoriyani tanlang." />
      )}

      {products && products.length > 0 && (
        <>
          <p className="muted small result-count">{products.length} ta mahsulot</p>
          <div className="grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
