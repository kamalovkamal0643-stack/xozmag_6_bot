import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { money, formatDate } from '../lib/format.js';
import { Badge, Empty, ErrorBox, PageHeader, Spinner, StatCard } from '../components/ui.jsx';

const SORTS = [
  ['totalSpent', "Ko'p xarid qilganlar"],
  ['ordersCount', "Ko'p buyurtma berganlar"],
  ['createdAt', 'Yangi mijozlar'],
];

function segment(customer) {
  if (!customer.ordersCount) return { label: 'Xarid qilmagan', tone: 'gray' };
  if (customer.totalSpent >= 1000000) return { label: '⭐ VIP', tone: 'violet' };
  if (customer.ordersCount >= 3) return { label: 'Doimiy', tone: 'green' };
  return { label: 'Yangi xaridor', tone: 'blue' };
}

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('totalSpent');

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setCustomers(await api.customers({ q }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) =>
      sort === 'createdAt' ? new Date(b.createdAt) - new Date(a.createdAt) : b[sort] - a[sort]
    );
  }, [customers, sort]);

  const totals = useMemo(() => {
    const list = customers || [];
    const buyers = list.filter((c) => c.ordersCount > 0);
    const revenue = buyers.reduce((sum, c) => sum + c.totalSpent, 0);
    return {
      all: list.length,
      buyers: buyers.length,
      repeat: buyers.filter((c) => c.ordersCount > 1).length,
      ltv: buyers.length ? Math.round(revenue / buyers.length) : 0,
    };
  }, [customers]);

  return (
    <div className="page">
      <PageHeader title="Mijozlar" subtitle="Botdan foydalangan barcha foydalanuvchilar" />

      {customers && (
        <div className="stats stats-4">
          <StatCard icon="👥" label="Jami foydalanuvchilar" value={totals.all} />
          <StatCard icon="🛍️" label="Xarid qilganlar" value={totals.buyers} />
          <StatCard icon="🔁" label="Qayta xarid qilganlar" value={totals.repeat} hint={totals.buyers ? `${Math.round((totals.repeat / totals.buyers) * 100)}% qaytish` : ''} />
          <StatCard icon="💎" label="O'rtacha mijoz qiymati" value={money(totals.ltv)} tone="accent" />
        </div>
      )}

      <div className="toolbar">
        <div className="tabs">
          {SORTS.map(([value, label]) => (
            <button key={value} className={`tab ${sort === value ? 'active' : ''}`} onClick={() => setSort(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input className="input" placeholder="🔍 Ism, telefon, username" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!customers && !error && <Spinner />}

      {customers && (
        <section className="panel">
          {sorted.length === 0 ? (
            <Empty text="Mijozlar topilmadi" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mijoz</th>
                    <th>Telefon</th>
                    <th>Segment</th>
                    <th className="right">Buyurtmalar</th>
                    <th className="right">Jami xarid</th>
                    <th>Oxirgi buyurtma</th>
                    <th>Qo'shilgan</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => {
                    const seg = segment(c);
                    return (
                      <tr key={c.id}>
                        <td>
                          <b>{[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Nomsiz'}</b>
                          <div className="muted small">{c.username ? `@${c.username}` : `ID ${c.telegramId}`}</div>
                        </td>
                        <td className="nowrap">{c.phone || '—'}</td>
                        <td>
                          <Badge tone={seg.tone}>{seg.label}</Badge>
                        </td>
                        <td className="right">{c.ordersCount}</td>
                        <td className="right nowrap">
                          <b>{money(c.totalSpent)}</b>
                        </td>
                        <td className="nowrap muted">{formatDate(c.lastOrderAt)}</td>
                        <td className="nowrap muted">{formatDate(c.createdAt, false)}</td>
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
