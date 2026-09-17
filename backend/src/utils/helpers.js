import { config } from '../config/default.js';

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });

export const money = (value) =>
  `${String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${config.shop.currency}`;

const OFFSET_MS = () => config.reports.utcOffsetMinutes * 60 * 1000;

export function startOfDay(date = new Date(), daysAgo = 0) {
  const local = new Date(date.getTime() + OFFSET_MS());
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - daysAgo);
  return new Date(local.getTime() - OFFSET_MS());
}

export function startOfMonth(date = new Date()) {
  const local = new Date(date.getTime() + OFFSET_MS());
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(1);
  return new Date(local.getTime() - OFFSET_MS());
}

export function localDateKey(date) {
  return new Date(new Date(date).getTime() + OFFSET_MS()).toISOString().slice(0, 10);
}

export function formatDateTime(date) {
  const d = new Date(new Date(date).getTime() + OFFSET_MS());
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const escapeHtml = (text = '') =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const toInt = (value, fallback = 0) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const STATUS_LABELS = {
  NEW: '🆕 Yangi',
  CONFIRMED: '✅ Tasdiqlandi',
  DELIVERING: '🚚 Yo\'lda',
  DELIVERED: '📦 Yetkazildi',
  CANCELLED: '❌ Bekor qilindi',
};
