import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Empty, ErrorBox, PageHeader, Spinner, toast } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';

function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState(() => category || { name: '', emoji: '📦', slug: '', sortOrder: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (category) await api.updateCategory(category.id, form);
      else await api.createCategory(form);
      toast('✓ Kategoriya saqlandi', 'green');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
      onClose={onClose}
      width={460}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" form="category-form" disabled={saving}>
            Saqlash
          </button>
        </>
      }
    >
      <form id="category-form" className="form-grid" onSubmit={save}>
        <label className="field">
          <span>Emoji</span>
          <input className="input" value={form.emoji} onChange={set('emoji')} maxLength={8} />
        </label>
        <label className="field">
          <span>Tartib raqami</span>
          <input className="input" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
        </label>
        <label className="field span-2">
          <span>Nomi *</span>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Masalan: Bog' uchun" required autoFocus />
        </label>
        <label className="field span-2">
          <span>Slug (lotincha, ixtiyoriy)</span>
          <input className="input" value={form.slug} onChange={set('slug')} placeholder="bog-uchun" />
        </label>
        {error && <div className="form-error span-2">{error}</div>}
      </form>
    </Modal>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setCategories(await api.categories());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (category) => {
    if (!window.confirm(`"${category.name}" kategoriyasi o'chirilsinmi?`)) return;
    try {
      await api.deleteCategory(category.id);
      toast("🗑 Kategoriya o'chirildi");
      load();
    } catch (err) {
      toast(err.message, 'red');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Kategoriyalar" subtitle="Mini App katalogidagi bo'limlar">
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Yangi kategoriya
        </button>
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!categories && !error && <Spinner />}

      {categories && (
        <section className="panel">
          {categories.length === 0 ? (
            <Empty text="Kategoriyalar yo'q" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tartib</th>
                    <th>Kategoriya</th>
                    <th>Slug</th>
                    <th className="right">Mahsulotlar</th>
                    <th className="right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="muted">{c.sortOrder}</td>
                      <td>
                        <span className="cat-emoji">{c.emoji}</span> <b>{c.name}</b>
                      </td>
                      <td className="muted">{c.slug}</td>
                      <td className="right">{c._count?.products ?? 0} ta</td>
                      <td className="right nowrap">
                        <div className="row-actions">
                          <button className="btn btn-light btn-sm" onClick={() => setEditing(c)}>
                            ✏️ Tahrirlash
                          </button>
                          <button className="btn btn-danger-light btn-sm" onClick={() => remove(c)}>
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
        <CategoryModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
