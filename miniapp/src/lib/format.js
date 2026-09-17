export const money = (value) =>
  `${String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

export const discountPercent = (product) =>
  product.oldPrice && product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

export function formatDate(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const ORDER_STATUS = {
  NEW: { label: 'Qabul qilindi', tone: 'blue' },
  CONFIRMED: { label: 'Tasdiqlandi', tone: 'blue' },
  DELIVERING: { label: "Yo'lda", tone: 'amber' },
  DELIVERED: { label: 'Yetkazildi', tone: 'green' },
  CANCELLED: { label: 'Bekor qilindi', tone: 'red' },
};

export function stockState(product) {
  if (product.stock <= 0) return { tone: 'red', short: 'Tugagan', long: 'Hozircha tugagan' };
  if (product.stock <= product.minStock) {
    return { tone: 'amber', short: `${product.stock} ${product.unit} qoldi`, long: `Kam qoldi: ${product.stock} ${product.unit} — shoshiling!` };
  }
  return { tone: 'green', short: 'Mavjud', long: `Omborda bor: ${product.stock} ${product.unit}` };
}

export const descriptionLines = (text = '') =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* xotira mavjud emas */
    }
  },
};
