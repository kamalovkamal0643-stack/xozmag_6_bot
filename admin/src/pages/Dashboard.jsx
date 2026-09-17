import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { money, num, shortMoney, formatDate, percentDiff, ORDER_STATUS, WEEKDAYS } from '../lib/format.js';
import { BarChart, Empty, ErrorBox, PageHeader, ProductThumb, Spinner, StatCard, StatusBadge } from '../components/ui.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard());
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('hz:new-order', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('hz:new-order', load);
    };
  }, [load]);

  if (!data) {
    return error ? <ErrorBox message={error} onRetry={load} /> : <Spinner />;
  }

  const { today, yesterday, month, week, hourly, statuses, inventory, lowStock, topProducts, recentOrders, customers } = data;

  const weekChart = week.map((d) => {
    const date = new Date(`${d.date}T00:00:00`);
    return { label: `${WEEKDAYS[date.getDay()]} ${date.getDate()}`, value: d.revenue, short: shortMoney(d.revenue) };
  });
  const weekTotal = week.reduce((sum, d) => sum + d.revenue, 0);

  const hourChart = hourly.slice(8, 23).map((h) => ({ label: `${h.hour}`, value: h.orders, short: String(h.orders) }));
  const statusTotal = Object.values(statuses).reduce((a, b) => a + b, 0) || 1;
  const maxTop = Math.max(...topProducts.map((p) => p.quantity), 1);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={`Bugun, ${formatDate(new Date(), false)} · yangilandi ${updatedAt ? formatDate(updatedAt).slice(-5) : ''}`}
      >
        <button className="btn btn-light" onClick={load}>
          ↻ Yangilash
        </button>
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="stats">
        <StatCard icon="🧾" label="Bugungi buyurtmalar" value={`${today.orders} ta`} hint={`Kecha: ${yesterday.orders} ta`} trend={percentDiff(today.orders, yesterday.orders)} />
        <StatCard icon="💰" label="Bugungi savdo" value={money(today.revenue)} hint={`Kecha: ${money(yesterday.revenue)}`} trend={percentDiff(today.revenue, yesterday.revenue)} tone="accent" />
        <StatCard icon="🧮" label="O'rtacha chek" value={money(today.avgCheck)} hint={`Sotilgan: ${num(today.itemsSold)} dona`} />
        <StatCard icon="📅" label="Shu oydagi savdo" value={money(month.revenue)} hint={`${month.orders} ta buyurtma`} />
        <StatCard icon="🏬" label="Ombor qiymati" value={money(inventory.value)} hint={`${num(inventory.units)} dona · ${inventory.products} tur`} />
        <StatCard
          icon="⚠️"
          label="Kam qolgan / tugagan"
          value={`${inventory.lowStock} / ${inventory.outOfStock}`}
          hint={`Mijozlar: ${customers} (+${today.newCustomers} bugun)`}
          tone={inventory.outOfStock ? 'warn' : undefined}
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>📈 Oxirgi 7 kun savdosi</h3>
            <b>{money(weekTotal)}</b>
          </div>
          <BarChart data={weekChart} format={money} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>🔄 Buyurtma holatlari</h3>
            <Link to="/orders" className="link">
              Barchasi →
            </Link>
          </div>
          <div className="status-list">
            {Object.entries(statuses).map(([status, count]) => (
              <div key={status} className="status-row">
                <StatusBadge status={status} />
                <div className="status-bar">
                  <i className={`tone-${ORDER_STATUS[status].tone}`} style={{ width: `${(count / statusTotal) * 100}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>🚨 To'ldirish kerak</h3>
            <Link to="/products" className="link">
              Omborga →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <Empty icon="✅" text="Barcha mahsulotlar yetarli" />
          ) : (
            <table className="table compact">
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-product">
                        <ProductThumb product={p} size={32} />
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="right">
                      <span className={`badge badge-${p.stock <= 0 ? 'red' : 'amber'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="right muted small">min {p.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>🏆 TOP mahsulotlar (30 kun)</h3>
          </div>
          {topProducts.length === 0 ? (
            <Empty icon="📭" text="Hali savdo bo'lmagan" />
          ) : (
            <div className="top-list">
              {topProducts.map((p, i) => (
                <div key={`${p.productId}-${p.name}`} className="top-row">
                  <span className="top-rank">{i + 1}</span>
                  <div className="top-info">
                    <div className="top-name">
                      <span>{p.name}</span>
                      <b>{num(p.quantity)} dona</b>
                    </div>
                    <div className="top-bar">
                      <i style={{ width: `${(p.quantity / maxTop) * 100}%` }} />
                    </div>
                    <small className="muted">{money(p.revenue)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid-2 grid-wide-left">
        <section className="panel">
          <div className="panel-head">
            <h3>🕒 So'nggi buyurtmalar</h3>
            <Link to="/orders" className="link">
              Barchasi →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <Empty text="Hali buyurtmalar yo'q. Mini App orqali birinchi buyurtmani bering!" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Raqam</th>
                    <th>Mijoz</th>
                    <th>Sana</th>
                    <th className="right">Summa</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="nowrap">
                        <b>#{o.number}</b>
                      </td>
                      <td>
                        {o.user?.firstName || 'Mijoz'}
                        <div className="muted small">{o.phone}</div>
                      </td>
                      <td className="nowrap">{formatDate(o.createdAt)}</td>
                      <td className="right nowrap">
                        <b>{money(o.total)}</b>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>⏰ Bugungi faollik</h3>
            <span className="muted small">soatlar bo'yicha</span>
          </div>
          <BarChart data={hourChart} format={(v) => `${v} ta buyurtma`} height={180} accentLast={false} />
        </section>
      </div>
    </div>
  );
}
