import { useApp } from '../context/AppContext.jsx';
import { haptic } from '../lib/telegram.js';

const TABS = [
  { id: 'home', icon: '🏠', label: 'Bosh sahifa' },
  { id: 'catalog', icon: '🔍', label: 'Katalog' },
  { id: 'cart', icon: '🛒', label: 'Savatcha' },
  { id: 'profile', icon: '👤', label: 'Profil' },
];

export default function BottomNav() {
  const { tab, setTab, cartCount, goToCatalog } = useApp();

  const select = (id) => {
    haptic('light');
    if (id === 'catalog') goToCatalog();
    else setTab(id);
  };

  return (
    <nav className="bottom-nav">
      {TABS.map((item) => (
        <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => select(item.id)}>
          <span className="nav-icon">
            {item.icon}
            {item.id === 'cart' && cartCount > 0 && <b className="nav-badge">{cartCount > 99 ? '99+' : cartCount}</b>}
          </span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
