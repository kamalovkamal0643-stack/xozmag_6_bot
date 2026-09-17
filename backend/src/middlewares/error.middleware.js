import { AppError } from '../utils/helpers.js';

export function notFound(req, res) {
  res.status(404).json({ ok: false, message: `Yo'l topilmadi: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, message: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, message: "Yuborilgan ma'lumot noto'g'ri formatda" });
  }
  if (err?.code === 'P2002') {
    const field = [].concat(err.meta?.target || []).join(', ');
    return res.status(409).json({ ok: false, message: `Bu qiymat allaqachon mavjud${field ? ` (${field})` : ''}` });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ ok: false, message: "Ma'lumot topilmadi" });
  }
  if (err?.code === 'P2003') {
    return res.status(409).json({ ok: false, message: "Bu yozuvga bog'liq ma'lumotlar bor" });
  }
  if (err?.name === 'PrismaClientInitializationError' || err?.code === 'P1001') {
    return res.status(503).json({ ok: false, message: "Ma'lumotlar bazasiga ulanib bo'lmadi" });
  }

  console.error('❌', err);
  res.status(500).json({ ok: false, message: 'Serverda kutilmagan xatolik' });
}
