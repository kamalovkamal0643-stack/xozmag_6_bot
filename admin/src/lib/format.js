export const num = (value) => String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const money = (value) => `${num(value)} so'm`;

export const shortMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0', '')} mln`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ming`;
  return String(n);
};

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value, withTime = true) {
  if (!value) return '—';
  const d = new Date(value);
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

export const WEEKDAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

export const ORDER_STATUS = {
  NEW: { label: 'Yangi', tone: 'blue', icon: '🆕' },
  CONFIRMED: { label: 'Tasdiqlangan', tone: 'violet', icon: '✅' },
  DELIVERING: { label: "Yo'lda", tone: 'amber', icon: '🚚' },
  DELIVERED: { label: 'Yetkazildi', tone: 'green', icon: '📦' },
  CANCELLED: { label: 'Bekor qilingan', tone: 'red', icon: '❌' },
};

export const NEXT_STATUS = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
};

export const STATUS_ACTION = {
  CONFIRMED: '✅ Tasdiqlash',
  DELIVERING: "🚚 Yo'lga chiqarish",
  DELIVERED: '📦 Yetkazildi',
  CANCELLED: '❌ Bekor qilish',
};

export const MOVE_TYPES = {
  IN: { label: 'Kirim', tone: 'green', sign: '+' },
  OUT: { label: 'Sotuv / chiqim', tone: 'blue', sign: '−' },
  WRITEOFF: { label: 'Hisobdan chiqarish', tone: 'red', sign: '−' },
  RETURN: { label: 'Qaytarildi', tone: 'violet', sign: '+' },
  ADJUST: { label: 'Inventarizatsiya', tone: 'amber', sign: '=' },
};

export const UNITS = ['dona', "to'plam", 'juft', 'kg', 'litr', 'metr', 'rulon', 'quti'];

export function stockTone(product) {
  if (product.stock <= 0) return 'red';
  if (product.stock <= product.minStock) return 'amber';
  return 'green';
}

export const percentDiff = (current, previous) => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
};
