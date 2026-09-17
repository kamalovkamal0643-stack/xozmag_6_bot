import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatDate, MOVE_TYPES } from '../lib/format.js';
import { Badge, Empty, ErrorBox, PageHeader, ProductThumb, Spinner } from '../components/ui.jsx';

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.products().then(setProducts).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setRows(await api.movements({ productId, type }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [productId, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <PageHeader title="Ombor harakati" subtitle="Har bir kirim, sotuv, qaytarish va hisobdan chiqarish tarixi (oxirgi 200 ta)" />

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${type === '' ? 'active' : ''}`} onClick={() => setType('')}>
            Barchasi
          </button>
          {Object.entries(MOVE_TYPES).map(([key, t]) => (
            <button key={key} className={`tab ${type === key ? 'active' : ''}`} onClick={() => setType(key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Barcha mahsulotlar</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!rows && !error && <Spinner />}

      {rows && (
        <section className="panel">
          {rows.length === 0 ? (
            <Empty text="Harakatlar topilmadi" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Mahsulot</th>
                    <th>Turi</th>
                    <th className="right">Miqdor</th>
                    <th className="right">Oldin → Keyin</th>
                    <th>Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const meta = MOVE_TYPES[m.type];
                    const sign = m.type === 'ADJUST' ? (m.after >= m.before ? '+' : '−') : meta.sign;
                    return (
                      <tr key={m.id}>
                        <td className="nowrap">{formatDate(m.createdAt)}</td>
                        <td>
                          <div className="cell-product">
                            <ProductThumb product={m.product} size={30} />
                            <span>{m.product.name}</span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className={`right nowrap ${sign === '+' ? 'text-green' : 'text-red'}`}>
                          <b>
                            {sign}
                            {m.quantity} {m.product.unit}
                          </b>
                        </td>
                        <td className="right nowrap muted">
                          {m.before} → <b className="text">{m.after}</b>
                        </td>
                        <td className="muted">{m.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
