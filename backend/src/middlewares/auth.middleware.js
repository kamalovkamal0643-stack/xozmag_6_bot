import crypto from 'node:crypto';
import { config, isAdminConfigured } from '../config/default.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../utils/helpers.js';

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

function parseUser(params) {
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export function validateInitData(initData, botToken, maxAgeSeconds = 7 * 24 * 60 * 60) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const sign = (skipKeys) =>
    crypto
      .createHmac('sha256', secret)
      .update(
        [...params.entries()]
          .filter(([key]) => !skipKeys.includes(key))
          .map(([key, value]) => `${key}=${value}`)
          .sort()
          .join('\n')
      )
      .digest('hex');

  const valid = safeEqual(sign(['hash']), hash) || safeEqual(sign(['hash', 'signature']), hash);
  return valid ? parseUser(params) : null;
}

const PROXY_HEADERS = ['cf-ray', 'cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host'];

const isDirectLocalRequest = (req) => !PROXY_HEADERS.some((header) => req.get(header));

export function localOnly(req, res, next) {
  if (!config.security.adminLocalOnly || isDirectLocalRequest(req)) return next();
  next(new AppError("Admin panel faqat do'kon kompyuterida ishlaydi", 403));
}

export async function telegramAuth(req, res, next) {
  try {
    const initData = req.get('x-telegram-init-data') || '';
    let tgUser = validateInitData(initData, config.bot.token);

    if (!tgUser && config.security.skipTelegramAuth && isDirectLocalRequest(req)) {
      tgUser = parseUser(new URLSearchParams(initData)) || {
        id: Number(req.get('x-dev-user-id')) || 100000001,
        first_name: 'Test',
        last_name: 'Mijoz',
        username: 'test_mijoz',
      };
    }

    if (!tgUser) throw new AppError('Ilovani Telegram bot orqali oching', 401);

    req.tgUser = tgUser;
    req.user = (await UserModel.findByTelegramId(tgUser.id)) || (await UserModel.upsertFromTelegram(tgUser));
    next();
  } catch (err) {
    next(err);
  }
}

const signAdminToken = (expiresAt) =>
  crypto.createHmac('sha256', config.admin.secret).update(`admin:${config.admin.password}:${expiresAt}`).digest('hex');

export function createAdminToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + config.admin.tokenTtlHours * 3600;
  return `${expiresAt}.${signAdminToken(expiresAt)}`;
}

function verifyAdminToken(token) {
  const [rawExpiry, signature] = String(token).split('.');
  const expiresAt = Number(rawExpiry);
  if (!expiresAt || !signature || expiresAt < Date.now() / 1000) return false;
  return safeEqual(signature, signAdminToken(expiresAt));
}

export function checkAdminPassword(password) {
  return isAdminConfigured() && safeEqual(password || '', config.admin.password);
}

export function adminAuth(req, res, next) {
  if (!isAdminConfigured()) {
    return next(new AppError('Admin panel sozlanmagan: serverda ADMIN_PASSWORD va ADMIN_SECRET kerak', 503));
  }
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && verifyAdminToken(token)) return next();
  next(new AppError('Sessiya tugagan. Qaytadan kiring', 401));
}
