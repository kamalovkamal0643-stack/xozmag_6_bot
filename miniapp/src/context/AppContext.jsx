import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { storage } from '../lib/format.js';

const AppContext = createContext(null);

const CART_KEY = 'hz_cart_v1';

const DEFAULT_SHOP = {
  name: 'Hozmagazin',
  phone: '',
  workHours: '09:00 - 21:00',
  deliveryFee: 10000,
  freeDeliveryFrom: 200000,
  minOrder: 20000,
};

const toCartItem = (product, quantity) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  oldPrice: product.oldPrice,
  unit: product.unit,
  emoji: product.emoji,
  imageUrl: product.imageUrl,
  stock: product.stock,
  minStock: product.minStock,
  quantity,
});

export function AppProvider({ children }) {
  const tgUser = getTelegramUser();

  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(tgUser ? { firstName: tgUser.first_name, username: tgUser.username } : null);
  const [stats, setStats] = useState({ ordersCount: 0, totalSpent: 0 });
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [authError, setAuthError] = useState('');
  const [cart, setCart] = useState(() => storage.get(CART_KEY, []));
  const [sheetProduct, setSheetProduct] = useState(null);
  const [catalogPreset, setCatalogPreset] = useState({ category: '', focusSearch: false });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const showToast = useCallback((text, tone = 'dark') => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.auth();
      setUser(data.user);
      setStats(data.stats);
      setShop(data.shop);
      setAuthError('');
    } catch (err) {
      setAuthError(err.message);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const cartRef = useRef(cart);

  useEffect(() => {
    storage.set(CART_KEY, cart);
  }, [cart]);

  const updateCart = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(cartRef.current) : updater;
    cartRef.current = next;
    setCart(next);
  }, []);

  const addToCart = useCallback(
    (product, quantity = 1, { silent = false } = {}) => {
      if (product.stock <= 0) {
        haptic('error');
        if (!silent) showToast('😔 Bu mahsulot hozircha tugagan', 'red');
        return false;
      }

      let capped = false;
      updateCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        const wanted = (existing?.quantity || 0) + quantity;
        const next = Math.min(wanted, product.stock);
        capped = wanted > product.stock;
        if (existing) return prev.map((item) => (item.id === product.id ? toCartItem(product, next) : item));
        return [...prev, toCartItem(product, next)];
      });

      haptic('light');
      if (silent) return true;
      if (capped) showToast(`Omborda faqat ${product.stock} ${product.unit} bor`, 'amber');
      else showToast(`✓ ${product.name} savatchaga qo'shildi`);
      return true;
    },
    [showToast, updateCart]
  );

  const setQuantity = useCallback(
    (id, quantity) => {
      let capped = null;
      updateCart((prev) =>
        prev
          .map((item) => {
            if (item.id !== id) return item;
            if (quantity > item.stock) {
              capped = item;
              return { ...item, quantity: item.stock };
            }
            return { ...item, quantity };
          })
          .filter((item) => item.quantity > 0)
      );
      haptic('light');
      if (capped) showToast(`Omborda faqat ${capped.stock} ${capped.unit} bor`, 'amber');
    },
    [showToast, updateCart]
  );

  const removeFromCart = useCallback((id) => updateCart((prev) => prev.filter((item) => item.id !== id)), [updateCart]);
  const clearCart = useCallback(() => updateCart([]), [updateCart]);

  const goToCatalog = useCallback((preset = {}) => {
    setCatalogPreset({ category: '', focusSearch: false, ...preset });
    setTab('catalog');
  }, []);

  const value = useMemo(() => {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      tab,
      setTab,
      user,
      stats,
      shop,
      authError,
      refreshProfile,
      cart,
      updateCart,
      cartCount,
      cartTotal,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      toCartItem,
      sheetProduct,
      openProduct: setSheetProduct,
      closeProduct: () => setSheetProduct(null),
      catalogPreset,
      goToCatalog,
      toast,
      showToast,
    };
  }, [tab, user, stats, shop, authError, refreshProfile, cart, updateCart, addToCart, setQuantity, removeFromCart, clearCart, sheetProduct, catalogPreset, goToCatalog, toast, showToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
