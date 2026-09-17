import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { storage } from './lib/format.js';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Cart from './pages/Cart.jsx';
import Profile from './pages/Profile.jsx';
import BottomNav from './components/BottomNav.jsx';
import ProductSheet from './components/ProductSheet.jsx';
import { Toast } from './components/Common.jsx';

const ONBOARDING_KEY = 'hz_onboarded_v1';

function Shell() {
  const { tab, sheetProduct, toast, authError } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="app">
      {authError && <div className="auth-banner">⚠️ {authError}</div>}
      <main className="page" key={tab}>
        {tab === 'home' && <Home />}
        {tab === 'catalog' && <Catalog />}
        {tab === 'cart' && <Cart />}
        {tab === 'profile' && <Profile />}
      </main>
      <BottomNav />
      {sheetProduct && <ProductSheet product={sheetProduct} />}
      {toast && <Toast key={toast.id} text={toast.text} tone={toast.tone} />}
    </div>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(() => storage.get(ONBOARDING_KEY, false));

  const finishOnboarding = () => {
    storage.set(ONBOARDING_KEY, true);
    setOnboarded(true);
  };

  return <AppProvider>{onboarded ? <Shell /> : <Onboarding onDone={finishOnboarding} />}</AppProvider>;
}
