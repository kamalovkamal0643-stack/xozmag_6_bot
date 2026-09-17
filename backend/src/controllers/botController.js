import { Markup } from 'telegraf';
import { config, isAdmin, hasHttpsMiniApp } from '../config/default.js';
import { UserModel } from '../models/User.js';
import { OrderModel } from '../models/Order.js';
import { prisma } from '../database/connection.js';
import {
  buildSalesReport,
  buildStockReport,
  buildProductSearch,
  buildOrderText,
  buildShopInfo,
} from '../services/report.service.js';
import { orderStatusKeyboard, notifyStatusChanged } from '../services/notify.service.js';
import { escapeHtml, money, formatDateTime, STATUS_LABELS } from '../utils/helpers.js';

const BTN = {
  myOrders: '📜 Buyurtmalarim',
  info: "ℹ️ Do'kon haqida",
  sendPhone: '📱 Raqamni yuborish',
  stats: '📊 Bugungi savdo',
  stock: '📦 Ombor',
  active: '🧾 Faol buyurtmalar',
};

const html = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } };

function shopInlineButton(text = "🛒 Do'konni ochish") {
  if (!hasHttpsMiniApp()) return undefined;
  return Markup.inlineKeyboard([Markup.button.webApp(text, config.bot.miniAppUrl)]).reply_markup;
}

function mainKeyboard(telegramId) {
  const rows = [[Markup.button.contactRequest(BTN.sendPhone), BTN.myOrders], [BTN.info]];
  if (isAdmin(telegramId)) rows.push([BTN.stats, BTN.stock], [BTN.active]);
  return Markup.keyboard(rows).resize().reply_markup;
}

export const botController = {
  BTN,

  async start(ctx) {
    await UserModel.upsertFromTelegram(ctx.from);
    const name = escapeHtml(ctx.from.first_name || 'mehmon');

    await ctx.reply(
      [
        `Assalomu alaykum, <b>${name}</b>! 👋`,
        '',
        `<b>${escapeHtml(config.shop.name)}</b> — uy-ro'zg'or va xo'jalik mollari do'koniga xush kelibsiz.`,
        '',
        '🧴 Tozalash vositalari   🧰 Asboblar',
        "💡 Elektr mollari           🍳 Oshxona",
        '',
        "🔎 Mahsulot bormi-yo'qligini bilish uchun shunchaki nomini yozing, masalan: <i>lampa</i>",
      ].join('\n'),
      { ...html, reply_markup: mainKeyboard(ctx.from.id) }
    );

    if (hasHttpsMiniApp()) {
      await ctx.reply("👇 Katalogni ochish va buyurtma berish uchun tugmani bosing:", {
        reply_markup: shopInlineButton(),
      });
    } else {
      await ctx.reply(
        "⚙️ Do'kon ilovasi hali ulanmagan. Admin .env faylida MINIAPP_URL (ngrok https manzili) ni yozishi kerak."
      );
    }

    if (isAdmin(ctx.from.id)) {
      await ctx.reply(
        '🛠 <b>Admin rejimi yoqilgan.</b>\n/stats — bugungi savdo\n/ombor — ombor qoldig\'i\n/buyurtmalar — faol buyurtmalar\n/admin — admin panel manzili',
        html
      );
    }
  },

  async help(ctx) {
    const lines = [
      '<b>🤖 Bot imkoniyatlari</b>',
      '',
      "/start — do'konni ochish",
      '/buyurtmam — mening buyurtmalarim',
      "/info — do'kon haqida",
      '/id — Telegram ID raqamingiz',
      '',
      "🔎 Istalgan mahsulot nomini yozing — bot uning narxi va omborda borligini aytadi.",
    ];
    if (isAdmin(ctx.from.id)) {
      lines.push('', '<b>🛠 Admin buyruqlari</b>', '/stats — bugungi savdo', '/ombor — ombor holati', '/buyurtmalar — faol buyurtmalar', '/admin — admin panel');
    }
    await ctx.reply(lines.join('\n'), html);
  },

  async myId(ctx) {
    await ctx.reply(
      `🆔 Sizning Telegram ID: <code>${ctx.from.id}</code>\n\nAdmin bo'lish uchun shu raqamni backend/.env faylidagi ADMIN_IDS ga yozing va serverni qayta ishga tushiring.`,
      html
    );
  },

  async info(ctx) {
    await ctx.reply(buildShopInfo(), { ...html, reply_markup: shopInlineButton() });
  },

  async contact(ctx) {
    const contact = ctx.message.contact;
    if (contact.user_id && contact.user_id !== ctx.from.id) {
      return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring 🙂");
    }
    await UserModel.upsertFromTelegram(ctx.from);
    const phone = contact.phone_number.startsWith('+') ? contact.phone_number : `+${contact.phone_number}`;
    await UserModel.setPhoneByTelegramId(ctx.from.id, phone);
    await ctx.reply(`✅ Raqamingiz saqlandi: <b>${escapeHtml(phone)}</b>\nEndi buyurtma berishda uni qayta yozish shart emas.`, {
      ...html,
      reply_markup: mainKeyboard(ctx.from.id),
    });
  },

  async myOrders(ctx) {
    const user = await UserModel.findByTelegramId(ctx.from.id);
    const orders = user ? (await OrderModel.listForUser(user.id)).slice(0, 5) : [];
    if (!orders.length) {
      return ctx.reply("Sizda hali buyurtmalar yo'q. Birinchi xaridni hoziroq qiling! 🛒", {
        reply_markup: shopInlineButton(),
      });
    }
    const lines = ['<b>📜 Oxirgi buyurtmalaringiz</b>', ''];
    for (const o of orders) {
      lines.push(`<b>#${o.number}</b> · ${formatDateTime(o.createdAt)}`);
      lines.push(`${STATUS_LABELS[o.status]} · ${o.items.length} xil mahsulot · <b>${money(o.total)}</b>`);
      lines.push('');
    }
    await ctx.reply(lines.join('\n'), { ...html, reply_markup: shopInlineButton('🔁 Yana buyurtma berish') });
  },

  async stats(ctx) {
    await ctx.reply(await buildSalesReport(), html);
  },

  async stock(ctx) {
    const text = ctx.message?.text || '';
    const query = text.startsWith('/') ? text.split(' ').slice(1).join(' ').trim() : '';
    const report = query ? await buildProductSearch(query, { admin: true }) : await buildStockReport();
    await ctx.reply(report || 'Kamida 2 ta harf yozing.', html);
  },

  async activeOrders(ctx) {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['NEW', 'CONFIRMED', 'DELIVERING'] } },
      include: { items: true, user: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    if (!orders.length) return ctx.reply('✨ Hozircha faol buyurtmalar yo\'q.');

    await ctx.reply(`<b>🧾 Faol buyurtmalar: ${orders.length} ta</b>\nHar biri ostidagi tugmalar orqali holatini o'zgartiring 👇`, html);
    for (const order of orders) {
      await ctx.reply(buildOrderText(order, { forAdmin: true }), { ...html, reply_markup: orderStatusKeyboard(order) });
    }
  },

  async adminPanel(ctx) {
    await ctx.reply(
      `🖥 <b>Admin panel</b>\n\nKompyuteringizda brauzerni oching:\n<code>${escapeHtml(config.admin.panelUrl)}</code>\n\nParol: backend/.env faylidagi ADMIN_PASSWORD`,
      html
    );
  },

  async changeStatus(ctx) {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('⛔ Faqat adminlar uchun', { show_alert: true });

    const [, id, status] = ctx.match;
    let order;
    try {
      order = await OrderModel.updateStatus(Number(id), status);
    } catch (err) {
      return ctx.answerCbQuery(err.message || 'Xatolik', { show_alert: true });
    }

    await ctx.answerCbQuery(`Holat: ${STATUS_LABELS[order.status]}`);
    await ctx
      .editMessageText(buildOrderText(order, { forAdmin: true }), { ...html, reply_markup: orderStatusKeyboard(order) })
      .catch(() => {});
    await notifyStatusChanged(order);
  },

  async search(ctx) {
    const text = ctx.message.text || '';
    if (text.startsWith('/')) {
      return ctx.reply("Bunday buyruq yo'q. /help ni bosing.");
    }
    const result = await buildProductSearch(text, { admin: isAdmin(ctx.from.id) });
    if (!result) return ctx.reply("🔎 Mahsulotni qidirish uchun kamida 2 ta harf yozing.");
    await ctx.reply(result, { ...html, reply_markup: shopInlineButton("🛒 Do'konda ko'rish") });
  },
};
