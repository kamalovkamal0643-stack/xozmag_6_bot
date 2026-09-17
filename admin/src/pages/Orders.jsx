import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { money, formatDate, ORDER_STATUS, NEXT_STATUS, STATUS_ACTION } from '../lib/format.js';
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge, toast } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';

const STATUS_TABS = [['', 'Barchasi'], ...Object.entries(ORDER_STATUS).map(([key, s]) => [key, s.label])];
const PERIODS = [
  ['', 'Barcha vaqt'],
  ['today', 'Bugun'],
  ['week', 'Oxirgi 7 kun'],
  ['month', 'Oxirgi 30 kun'],
];

function OrderModal({ order, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const user = order.user || {};

  const change = async (status) => {
    if (status === 'CANCELLED' && !window.confirm(`#${order.number} buyurtmani bekor qilasizmi? Mahsulotlar omborga qaytariladi.`)) return;
    setBusy(true);
    try {
      const updated = await api.setOrderStatus(order.id, status);
      toast(`#${order.number}: ${ORDER_STATUS[status].label}`, 'green');
      onChanged(updated);
    } catch (err) {
      toast(err.message, 'red');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Buyurtma #${order.number}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          {NEXT_STATUS[order.status].map((status) => (
            <button
              key={status}
              className={`btn ${status === 'CANCELLED' ? 'btn-danger-light' : 'btn-primary'}`}
              disabled={busy}
              onClick={() => change(status)}
            >
              {STATUS_ACTION[status]}
            </button>
          ))}
          <button className="btn btn-light" onClick={onClose}>
            Yopish
          </button>
        </>
      }
    >
      <div className="order-meta">
        <div>
          <small>Holat</small>
          <StatusBadge status={order.status} />
        </div>
        <div>
          <small>Sana</small>
          <b>{formatDate(order.createdAt)}</b>
        </div>
        <div>
          <small>To'lov</small>
          <b>{order.paymentType === 'CARD' ? '💳 Karta' : '💵 Naqd'}</b>
        </div>
      </div>

      <div className="info-block">
        <div>
          <small>Mijoz</small>
          <b>{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Mijoz'}</b>
          {user.username && <span className="muted"> @{user.username}</span>}
        </div>
        <div>
          <small>Telefon</small>
          <a href={`tel:${order.phone.replace(/\s/g, '')}`}>{order.phone || '—'}</a>
        </div>
        <div className="span-2">
          <small>Manzil</small>
          <span>
            {order.address || '—'}
            {order.latitude && (
              <>
                {' · '}
                <a href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer">
                  📍 Xaritada ochish
                </a>
              </>
            )}
          </span>
        </div>
        {order.comment && (
          <div className="span-2">
            <small>Izoh</small>
            <span>{order.comment}</span>
          </div>
        )}
      </div>

      <table className="table compact">
        <thead>
          <tr>
            <th>Mahsulot</th>
            <th className="right">Narx</th>
            <th className="right">Soni</th>
            <th className="right">Jami</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.emoji} {item.name}
              </td>
              <td className="right nowrap">{money(item.price)}</td>
              <td className="right nowrap">
                {item.quantity} {item.unit}
              </td>
              <td className="right nowrap">
                <b>{money(item.total)}</b>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Mahsulotlar</td>
            <td className="right nowrap">{money(order.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3}>Yetkazib berish</td>
            <td className="right nowrap">{order.deliveryFee ? money(order.deliveryFee) : 'Bepul'}</td>
          </tr>
          <tr className="total-row">
            <td colSpan={3}>Jami</td>
            <td className="right nowrap">{money(order.total)}</td>
          </tr>
        </tfoot>
      </table>
    </Modal>
  );
}

export default function Orders() {
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setData(await api.orders({ status, period, q, page, pageSize: 20 }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [status, period, q, page]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener('hz:new-order', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('hz:new-order', load);
    };
  }, [load]);

  const quickChange = async (order, next) => {
    if (next === 'CANCELLED' && !window.confirm(`#${order.number} buyurtmani bekor qilasizmi?`)) return;
    try {
      await api.setOrderStatus(order.id, next);
      toast(`#${order.number}: ${ORDER_STATUS[next].label}`, 'green');
      window.dispatchEvent(new Event('hz:orders-changed'));
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  };

  const onModalChanged = (updated) => {
    setSelected(updated);
    window.dispatchEvent(new Event('hz:orders-changed'));
    load();
  };

  const exportCsv = async () => {
    try {
      await api.downloadOrdersCsv({ status, period });
      toast('📥 CSV fayl yuklab olindi', 'green');
    } catch (err) {
      toast(err.message, 'red');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Buyurtmalar" subtitle="Har 15 soniyada avtomatik yangilanadi">
        <button className="btn btn-light" onClick={exportCsv}>
          📥 Excel (CSV)
        </button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs">
          {STATUS_TABS.map(([value, label]) => (
            <button
              key={value || 'all'}
              className={`tab ${status === value ? 'active' : ''}`}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <select
            className="input"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(1);
            }}
          >
            {PERIODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input className="input" placeholder="🔍 Raqam, telefon, ism..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner />}

      {data && (
        <section className="panel">
          <div className="panel-head">
            <span className="muted">
              {data.total} ta buyurtma · summa: <b className="text">{money(data.revenue)}</b>
            </span>
          </div>

          {data.orders.length === 0 ? (
            <Empty text="Bu filtr bo'yicha buyurtmalar topilmadi" />
          ) : (
            <div className="table-wrap">
              <table className="table hover">
                <thead>
                  <tr>
                    <th>Raqam</th>
                    <th>Sana</th>
                    <th>Mijoz</th>
                    <th>Mahsulotlar</th>
                    <th className="right">Summa</th>
                    <th>Holat</th>
                    <th className="right">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => {
                    const next = NEXT_STATUS[o.status].find((s) => s !== 'CANCELLED');
                    return (
                      <tr key={o.id} className={o.status === 'NEW' ? 'row-new' : ''} onClick={() => setSelected(o)}>
                        <td className="nowrap">
                          <b>#{o.number}</b>
                        </td>
                        <td className="nowrap">{formatDate(o.createdAt)}</td>
                        <td>
                          <div>{[o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || 'Mijoz'}</div>
                          <div className="muted small nowrap">{o.phone}</div>
                        </td>
                        <td className="items-cell">
                          {o.items.map((i) => `${i.emoji} ${i.name} ×${i.quantity}`).join(', ')}
                        </td>
                        <td className="right nowrap">
                          <b>{money(o.total)}</b>
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="right" onClick={(e) => e.stopPropagation()}>
                          {next && (
                            <button className="btn btn-primary btn-sm nowrap" onClick={() => quickChange(o, next)}>
                              {STATUS_ACTION[next]}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-light btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Oldingi
              </button>
              <span className="muted">
                {page} / {data.pages}
              </span>
              <button className="btn btn-light btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Keyingi →
              </button>
            </div>
          )}
        </section>
      )}

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onChanged={onModalChanged} />}
    </div>
  );
}
