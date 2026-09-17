import { Markup } from 'telegraf';
import { bot } from '../core/bot.js';
import { config } from '../config/default.js';
import { prisma } from '../database/connection.js';
import { buildOrderText } from './report.service.js';
import { escapeHtml } from '../utils/helpers.js';

export async function sendSafe(chatId, text, extra = {}) {
  if (!bot || !chatId) return null;
  try {
    return await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
  } catch (err) {
    console.warn(`⚠️  Telegram xabar yuborilmadi (${chatId}): ${err.description || err.message}`);
    return null;
  }
}

export const sendToAdmins = (text, extra) =>
  Promise.all(config.bot.adminIds.map((id) => sendSafe(id, text, extra)));

const NEXT_ACTIONS = {
  NEW: [['CONFIRMED', '✅ Tasdiqlash'], ['CANCELLED', '❌ Bekor qilish']],
  CONFIRMED: [['DELIVERING', "🚚 Yo'lga chiqdi"], ['CANCELLED', '❌ Bekor qilish']],
  DELIVERING: [['DELIVERED', '📦 Yetkazildi'], ['CANCELLED', '❌ Bekor qilish']],
};

export function orderStatusKeyboard(order) {
  const actions = NEXT_ACTIONS[order.status];
  if (!actions) return undefined;
  return Markup.inlineKeyboard(actions.map(([status, label]) => Markup.button.callback(label, `st:${order.id}:${status}`))).reply_markup;
}

const CUSTOMER_STATUS_TEXT = {
  CONFIRMED: (o) => `✅ Buyurtmangiz <b>#${o.number}</b> tasdiqlandi va yig'ilmoqda.`,
  DELIVERING: (o) => `🚚 Buyurtmangiz <b>#${o.number}</b> yo'lga chiqdi! Kuryer tez orada yetib boradi.`,
  DELIVERED: (o) => `📦 Buyurtmangiz <b>#${o.number}</b> yetkazildi.\nXaridingiz uchun rahmat! 🙏`,
  CANCELLED: (o) =>
    `❌ Buyurtmangiz <b>#${o.number}</b> bekor qilindi.\nSavollar bo'lsa qo'ng'iroq qiling: ${escapeHtml(config.shop.phone)}`,
};

export async function notifyOrderCreated(order) {
  await sendSafe(
    order.user.telegramId,
    `✅ <b>Buyurtmangiz muvaffaqiyatli qabul qilindi!</b>\nKuryerimiz tez orada siz bilan bog'lanadi 🚚\n\n${buildOrderText(order)}`
  );

  if (!config.bot.adminIds.length) return;

  await sendToAdmins(`🔔 <b>YANGI BUYURTMA!</b>\n\n${buildOrderText(order, { forAdmin: true })}`, {
    reply_markup: orderStatusKeyboard(order),
  });

  const ids = order.items.map((i) => i.productId).filter(Boolean);
  const low = await prisma.product.findMany({
    where: { id: { in: ids }, stock: { lte: prisma.product.fields.minStock } },
  });
  if (low.length) {
    const lines = low.map(
      (p) => `${p.stock <= 0 ? '🔴' : '🟡'} ${p.emoji} ${escapeHtml(p.name)} — <b>${p.stock}</b> ${p.unit} qoldi`
    );
    await sendToAdmins(`⚠️ <b>Omborni to'ldirish vaqti keldi</b>\n\n${lines.join('\n')}`);
  }
}

export async function notifyStatusChanged(order) {
  const build = CUSTOMER_STATUS_TEXT[order.status];
  if (build && order.user?.telegramId) await sendSafe(order.user.telegramId, build(order));
}
