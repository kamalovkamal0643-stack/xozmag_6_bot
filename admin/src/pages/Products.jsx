import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { money, num, stockTone, UNITS, MOVE_TYPES } from '../lib/format.js';
import { Badge, Empty, ErrorBox, PageHeader, ProductThumb, Spinner, StatCard, toast } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';

const FILTERS = [
  ['', 'Barchasi'],
  ['low', '🟡 Kam qolgan'],
  ['out', '🔴 Tugagan'],
  ['hidden', '🙈 Yashirilgan'],
];

const EMPTY_FORM = {
  name: '',
  emoji: '📦',
  imageUrl: '',
  categoryId: '',
  price: '',
  oldPrice: '',
  unit: 'dona',
  sku: '',
  stock: '',
  minStock: 5,
  description: '',
  isActive: true,
};

function ProductFormModal({ product, categories, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() =>
    product
      ? { ...EMPTY_FORM, ...product, oldPrice: product.oldPrice ?? '', categoryId: product.categoryId }
      : { ...EMPTY_FORM, categoryId: categories[0]?.id || '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, price: Number(form.price), oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice) };
      const saved = isEdit ? await api.updateProduct(product.id, payload) : await api.createProduct(payload);
      toast(isEdit ? '✓ Mahsulot yangilandi' : "✓ Yangi mahsulot qo'shildi", 'green');
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" form="product-form" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={save}>
        <div className="preview span-2">
          <ProductThumb key={form.imageUrl} product={form} size={72} />
          <div>
            <b>{form.name || 'Mahsulot nomi'}</b>
            <div>
              {form.oldPrice && <s className="muted">{money(form.oldPrice)}</s>}{' '}
              <b className={form.oldPrice ? 'text-red' : ''}>{money(form.price)}</b> / {form.unit}
            </div>
          </div>
        </div>

        <label className="field span-2">
          <span>Nomi *</span>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Masalan: LED lampa 12 W E27" required />
        </label>

        <label className="field">
          <span>Kategoriya *</span>
          <select className="input" value={form.categoryId} onChange={set('categoryId')} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Emoji (rasm bo'lmasa ko'rinadi)</span>
          <input className="input" value={form.emoji} onChange={set('emoji')} maxLength={8} />
        </label>

        <label className="field span-2">
          <span>Rasm URL (ixtiyoriy)</span>
          <input className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
        </label>

        <label className="field">
          <span>Yangi narx (so'm) *</span>
          <input className="input" type="number" min="0" value={form.price} onChange={set('price')} required />
        </label>

        <label className="field">
          <span>Eski narx (chegirma uchun)</span>
          <input className="input" type="number" min="0" value={form.oldPrice} onChange={set('oldPrice')} placeholder="Bo'sh qoldirish mumkin" />
        </label>

        <label className="field">
          <span>O'lchov birligi</span>
          <select className="input" value={form.unit} onChange={set('unit')}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Artikul (SKU)</span>
          <input className="input" value={form.sku} onChange={set('sku')} placeholder="Avtomatik yaratiladi" />
        </label>

        {!isEdit && (
          <label className="field">
            <span>Boshlang'ich qoldiq</span>
            <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="0" />
          </label>
        )}

        <label className="field">
          <span>Minimal qoldiq (ogohlantirish)</span>
          <input className="input" type="number" min="0" value={form.minStock} onChange={set('minStock')} />
        </label>

        <label className="field span-2">
          <span>Xususiyatlari (har biri yangi qatordan)</span>
          <textarea className="input" rows={5} value={form.description} onChange={set('description')} placeholder={"Quvvati: 12 W\nPatron: E27\nKafolat: 1 yil"} />
        </label>

        <label className="checkbox span-2">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
          <span>Sotuvda (Mini App'da ko'rinadi)</span>
        </label>

        {error && <div className="form-error span-2">{error}</div>}
      </form>
    </Modal>
  );
}

function StockModal({ product, onClose, onSaved }) {
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const qty = Number(quantity) || 0;
  const after = type === 'IN' ? product.stock + qty : type === 'ADJUST' ? qty : product.stock - qty;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.adjustStock(product.id, { type, quantity: qty, note });
      toast(`✓ ${product.name}: qoldiq ${updated.stock} ${updated.unit}`, 'green');
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Qoldiq: ${product.name}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" form="stock-form" disabled={saving || (type !== 'ADJUST' && qty <= 0) || after < 0}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </>
      }
    >
      <form id="stock-form" className="form-grid one" onSubmit={save}>
        <div className="segmented">
          {['IN', 'WRITEOFF', 'ADJUST'].map((t) => (
            <button key={t} type="button" className={type === t ? 'active' : ''} onClick={() => setType(t)}>
              {MOVE_TYPES[t].label}
            </button>
          ))}
        </div>

        <p className="muted small">
          {type === 'IN' && "Omborga yangi mahsulot keldi — miqdor qo'shiladi."}
          {type === 'WRITEOFF' && 'Singan, yaroqsiz yoki yo\'qolgan mahsulot — miqdor ayriladi.'}
          {type === 'ADJUST' && "Sanab chiqilgan haqiqiy qoldiqni kiriting — tizim shu raqamga to'g'rilaydi."}
        </p>

        <label className="field">
          <span>{type === 'ADJUST' ? 'Haqiqiy qoldiq' : 'Miqdor'} ({product.unit})</span>
          <input className="input input-lg" type="number" min="0" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>

        <div className="stock-preview">
          <div>
            <small>Hozir</small>
            <b>{product.stock}</b>
          </div>
          <span>→</span>
          <div>
            <small>Keyin</small>
            <b className={after < 0 ? 'text-red' : 'text-green'}>{after}</b>
          </div>
        </div>

        <label className="field">
          <span>Izoh</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: Yetkazib beruvchi — Chilonzor ulgurji" />
        </label>

        {error && <div className="form-error">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Products() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);

  useEffect(() => {
    api.categories().then(setCategories).catch((err) => toast(err.message, 'red'));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setProducts(await api.products({ q, categoryId, filter }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [q, categoryId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const list = products || [];
    return list.reduce(
      (acc, p) => {
        acc.units += Math.max(p.stock, 0);
        acc.value += Math.max(p.stock, 0) * p.price;
        if (p.stock <= 0) acc.out += 1;
        else if (p.stock <= p.minStock) acc.low += 1;
        return acc;
      },
      { units: 0, value: 0, low: 0, out: 0 }
    );
  }, [products]);

  const remove = async (product) => {
    if (!window.confirm(`"${product.name}" o'chirilsinmi?\nBuyurtmalar tarixi saqlanib qoladi.`)) return;
    try {
      await api.deleteProduct(product.id);
      toast("🗑 Mahsulot o'chirildi", 'dark');
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  };

  const afterSave = () => {
    setEditing(null);
    setStockProduct(null);
    load();
  };

  return (
    <div className="page">
      <PageHeader title="Mahsulotlar" subtitle="Narxlar, qoldiqlar va assortiment">
        <button className="btn btn-primary" onClick={() => setEditing('new')} disabled={!categories.length}>
          + Yangi mahsulot
        </button>
      </PageHeader>

      {products && (
        <div className="stats stats-4">
          <StatCard icon="🏷️" label="Ro'yxatda" value={`${products.length} tur`} />
          <StatCard icon="🔢" label="Jami qoldiq" value={`${num(summary.units)} dona`} />
          <StatCard icon="💵" label="Ombor qiymati" value={money(summary.value)} tone="accent" />
          <StatCard icon="⚠️" label="Kam qolgan / tugagan" value={`${summary.low} / ${summary.out}`} tone={summary.out ? 'warn' : undefined} />
        </div>
      )}

      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map(([value, label]) => (
            <button key={value || 'all'} className={`tab ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Barcha kategoriyalar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <input className="input" placeholder="🔍 Nomi yoki artikul" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!products && !error && <Spinner />}

      {products && (
        <section className="panel">
          {products.length === 0 ? (
            <Empty text="Mahsulotlar topilmadi" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th>Kategoriya</th>
                    <th className="right">Narx</th>
                    <th className="right">Qoldiq</th>
                    <th>Holat</th>
                    <th className="right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={p.isActive ? '' : 'row-muted'}>
                      <td>
                        <div className="cell-product">
                          <ProductThumb product={p} />
                          <div>
                            <b>{p.name}</b>
                            <div className="muted small">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="nowrap">
                        {p.category?.emoji} {p.category?.name}
                      </td>
                      <td className="right nowrap">
                        {p.oldPrice && <div className="muted small strike">{money(p.oldPrice)}</div>}
                        <b className={p.oldPrice ? 'text-red' : ''}>{money(p.price)}</b>
                      </td>
                      <td className="right nowrap">
                        <Badge tone={stockTone(p)}>
                          {p.stock} {p.unit}
                        </Badge>
                        <div className="muted small">min {p.minStock}</div>
                      </td>
                      <td>{p.isActive ? <Badge tone="green">Sotuvda</Badge> : <Badge>Yashirin</Badge>}</td>
                      <td className="right nowrap">
                        <div className="row-actions">
                          <button className="btn btn-light btn-sm" onClick={() => setStockProduct(p)} title="Kirim / chiqim">
                            ± Qoldiq
                          </button>
                          <button className="btn btn-light btn-sm" onClick={() => setEditing(p)} title="Tahrirlash">
                            ✏️
                          </button>
                          <button className="btn btn-danger-light btn-sm" onClick={() => remove(p)} title="O'chirish">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={afterSave}
        />
      )}
      {stockProduct && <StockModal product={stockProduct} onClose={() => setStockProduct(null)} onSaved={afterSave} />}
    </div>
  );
}
