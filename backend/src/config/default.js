import 'dotenv/config';

const num = (value, fallback) => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
};

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const list = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const trimUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export const isCloud = Boolean(process.env.RENDER);

export const config = {
  port: num(process.env.PORT, 5000),
  host: process.env.HOST || (isCloud ? '0.0.0.0' : '127.0.0.1'),
  corsOrigins: list(process.env.CORS_ORIGINS).map(trimUrl),

  bot: {
    token: (process.env.BOT_TOKEN || '').trim(),
    adminIds: list(process.env.ADMIN_IDS),
    miniAppUrl: trimUrl(process.env.MINIAPP_URL),
    webhookDomain: trimUrl(process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL),
  },

  admin: {
    panelUrl: trimUrl(process.env.ADMIN_PANEL_URL || 'http://localhost:5174'),
    password: process.env.ADMIN_PASSWORD || (isCloud ? '' : 'admin123'),
    secret: process.env.ADMIN_SECRET || (isCloud ? '' : 'hozmagazin-secret'),
    tokenTtlHours: num(process.env.ADMIN_TOKEN_TTL_HOURS, 168),
  },

  security: {
    skipTelegramAuth: bool(process.env.SKIP_TELEGRAM_AUTH, false),
    adminLocalOnly: bool(process.env.ADMIN_LOCAL_ONLY, !isCloud),
  },

  shop: {
    name: process.env.SHOP_NAME || 'Hozmagazin',
    phone: process.env.SHOP_PHONE || '+998 90 123 45 67',
    workHours: process.env.SHOP_WORK_HOURS || '09:00 - 21:00',
    currency: "so'm",
    deliveryFee: num(process.env.DELIVERY_FEE, 10000),
    freeDeliveryFrom: num(process.env.FREE_DELIVERY_FROM, 200000),
    minOrder: num(process.env.MIN_ORDER, 20000),
  },

  keepAlive: {
    url: trimUrl(process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL),
    minutes: num(process.env.KEEP_ALIVE_MINUTES, isCloud ? 5 : 0),
  },

  release: String(process.env.RENDER_GIT_COMMIT || '').slice(0, 7),

  reports: {
    cron: process.env.DAILY_REPORT_CRON || '0 20 * * *',
    timezone: process.env.TZ_NAME || 'Asia/Tashkent',
    utcOffsetMinutes: num(process.env.TZ_OFFSET_MINUTES, 300),
  },
};

export const isAdmin = (telegramId) => config.bot.adminIds.includes(String(telegramId));

export const hasBotToken = () => /^\d+:[\w-]{30,}$/.test(config.bot.token);

export const hasHttpsMiniApp = () => config.bot.miniAppUrl.startsWith('https://');

export const isAdminConfigured = () => Boolean(config.admin.password && config.admin.secret);

export function getConfigWarnings() {
  const warnings = [];
  if (!String(process.env.DATABASE_URL || '').startsWith('postgres')) {
    warnings.push("DATABASE_URL to'ldirilmagan (PostgreSQL connection string kerak).");
  }
  if (!hasBotToken()) warnings.push("BOT_TOKEN noto'g'ri yoki bo'sh — bot ishga tushmaydi.");
  if (!config.bot.adminIds.length) warnings.push("ADMIN_IDS bo'sh — /stats va kunlik hisobot hech kimga yuborilmaydi.");
  if (!hasHttpsMiniApp()) warnings.push("MINIAPP_URL https manzil emas — botda Do'kon tugmasi chiqmaydi.");
  if (!isAdminConfigured()) warnings.push("ADMIN_PASSWORD yoki ADMIN_SECRET yo'q — admin panelga kirib bo'lmaydi.");
  if (config.security.skipTelegramAuth && !isCloud) {
    warnings.push("SKIP_TELEGRAM_AUTH=true — Mini App'ni localhost brauzerida Telegram'siz sinash mumkin (tunnel orqali emas).");
  }
  return warnings;
}

export function reloadAdminIds(rawValue) {
  const ids = list(rawValue);
  if (ids.join(',') === config.bot.adminIds.join(',')) return false;
  config.bot.adminIds = ids;
  return true;
}

export function reloadMiniAppUrl(rawValue) {
  const url = trimUrl(rawValue);
  if (!url || url === config.bot.miniAppUrl) return false;
  config.bot.miniAppUrl = url;
  return true;
}
