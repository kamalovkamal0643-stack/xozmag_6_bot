import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { UserModel } from '../models/User.js';
import { config } from '../config/default.js';
import { money, startOfDay, escapeHtml, formatDateTime, STATUS_LABELS } from '../utils/helpers.js';

const percentChange = (current, previous) => {
  if (!previous) return '';
  const diff = Math.round(((current - previous) / previous) * 100);
  return diff >= 0 ? ` <i>(📈 +${diff}%)</i>` : ` <i>(📉 ${diff}%)</i>`;
};

export async function buildSalesReport(title = '📊 Bugungi savdo') {
  const today = startOfDay();
  const yesterday = startOfDay(new Date(), 1);

  const [t, y, week, top, statuses, inventory, newCustomers] = await Promise.all([
    OrderModel.summary(today),
    OrderModel.summary(yesterday, today),
    OrderModel.summary(startOfDay(new Date(), 6)),
    OrderModel.topProducts(today, 3),
    OrderModel.statusCounts(),
    ProductModel.inventorySummary(),
    UserModel.count({ createdAt: { gte: today } }),
  ]);

  const pending = statuses.NEW + statuses.CONFIRMED + statuses.DELIVERING;
  const lines = [
    `<b>${title}</b>`,
    `<i>${formatDateTime(new Date())}</i>`,
    '',
    `🧾 Buyurtmalar: <b>${t.orders} ta</b>${percentChange(t.orders, y.orders)}`,
    `💰 Savdo summasi: <b>${money(t.revenue)}</b>${percentChange(t.revenue, y.revenue)}`,
    `🧮 O'rtacha chek: <b>${money(t.avgCheck)}</b>`,
    `📦 Sotilgan mahsulot: <b>${t.itemsSold} dona</b>`,
    `👤 Yangi mijozlar: <b>${newCustomers}</b>`,
    '',
    `⏳ Jarayondagi buyurtmalar: <b>${pending}</b> (🆕 ${statuses.NEW} · ✅ ${statuses.CONFIRMED} · 🚚 ${statuses.DELIVERING})`,
    `📅 Oxirgi 7 kun: <b>${week.orders} ta</b> / <b>${money(week.revenue)}</b>`,
    `📉 Kecha: ${y.orders} ta / ${money(y.revenue)}`,
  ];

  if (top.length) {
    lines.push('', '<b>🏆 Bugungi TOP mahsulotlar:</b>');
    top.forEach((p, i) => lines.push(`${i + 1}. ${escapeHtml(p.name)} — ${p.quantity} dona (${money(p.revenue)})`));
  }

  if (inventory.outOfStock || inventory.lowStock) {
    lines.push('', `⚠️ Omborda: 🔴 ${inventory.outOfStock} ta tugagan, 🟡 ${inventory.lowStock} ta kam qolgan → /ombor`);
  }

  return lines.join('\n');
}

export async function buildStockReport() {
  const [inventory, low] = await Promise.all([ProductModel.inventorySummary(), ProductModel.lowStock(30)]);

  const lines = [
    '<b>📦 Ombor holati</b>',
    '',
    `🏷 Sotuvdagi mahsulot turlari: <b>${inventory.products}</b>`,
    `🔢 Jami qoldiq: <b>${inventory.units} dona</b>`,
    `💵 Ombor qiymati: <b>${money(inventory.value)}</b>`,
    `🔴 Tugagan: <b>${inventory.outOfStock}</b>   🟡 Kam qolgan: <b>${inventory.lowStock}</b>`,
  ];

  if (low.length) {
    lines.push('', "<b>To'ldirish kerak:</b>");
    for (const p of low) {
      const mark = p.stock <= 0 ? '🔴' : '🟡';
      lines.push(`${mark} ${p.emoji} ${escapeHtml(p.name)} — <b>${p.stock}</b> ${p.unit} <i>(min: ${p.minStock})</i>`);
    }
  } else {
    lines.push('', "✅ Barcha mahsulotlar yetarli miqdorda.");
  }

  lines.push('', "🔎 Aniq mahsulot qoldig'ini bilish uchun nomini yozing, masalan: <code>lampa</code>");
  return lines.join('\n');
}

export async function buildProductSearch(query, { admin = false } = {}) {
  const q = String(query || '').trim().slice(0, 50);
  if (q.length < 2) return null;

  const products = (await ProductModel.listForClient({ q })).slice(0, 8);
  if (!products.length) {
    return `😔 "<b>${escapeHtml(q)}</b>" bo'yicha hech narsa topilmadi.\nBoshqacha yozib ko'ring yoki do'konni ochib katalogni ko'ring.`;
  }

  const lines = [`🔎 "<b>${escapeHtml(q)}</b>" bo'yicha natijalar:`, ''];
  for (const p of products) {
    let availability;
    if (p.stock <= 0) availability = '🔴 Tugagan';
    else if (p.stock <= p.minStock) availability = `🟡 Kam qoldi: ${p.stock} ${p.unit}`;
    else availability = admin ? `🟢 Bor: ${p.stock} ${p.unit}` : '🟢 Mavjud';

    const oldPrice = p.oldPrice ? ` <s>${money(p.oldPrice)}</s>` : '';
    lines.push(`${p.emoji} <b>${escapeHtml(p.name)}</b>`);
    lines.push(`   💰 ${money(p.price)}${oldPrice} · ${availability}${admin ? ` · <code>${p.sku}</code>` : ''}`);
  }
  return lines.join('\n');
}

export function buildOrderText(order, { forAdmin = false } = {}) {
  const lines = [];

  if (forAdmin) {
    const u = order.user || {};
    lines.push(`<b>🧾 Buyurtma #${order.number}</b> — ${STATUS_LABELS[order.status]}`);
    lines.push(`🕒 ${formatDateTime(order.createdAt)}`);
    lines.push('');
    lines.push(`👤 ${escapeHtml([u.firstName, u.lastName].filter(Boolean).join(' ') || 'Mijoz')}${u.username ? ` (@${u.username})` : ''}`);
    lines.push(`📞 ${escapeHtml(order.phone || u.phone || '—')}`);
  } else {
    lines.push(`<b>🧾 Buyurtma #${order.number}</b>`);
  }

  lines.push('━━━━━━━━━━━━━━');
  for (const item of order.items) {
    lines.push(`${item.emoji} ${escapeHtml(item.name)}`);
    lines.push(`     ${item.quantity} × ${money(item.price)} = <b>${money(item.total)}</b>`);
  }
  lines.push('━━━━━━━━━━━━━━');
  lines.push(`Mahsulotlar: ${money(order.subtotal)}`);
  lines.push(`Yetkazish: ${order.deliveryFee ? money(order.deliveryFee) : 'bepul 🎉'}`);
  lines.push(`💰 <b>Jami: ${money(order.total)}</b>`);
  lines.push(`💳 To'lov: ${order.paymentType === 'CARD' ? 'Karta orqali (kuryerga)' : 'Naqd pul'}`);
  if (order.address) lines.push(`📍 Manzil: ${escapeHtml(order.address)}`);
  if (order.latitude && order.longitude) {
    lines.push(`🗺 <a href="https://maps.google.com/?q=${order.latitude},${order.longitude}">Xaritada ko'rish</a>`);
  }
  if (order.comment) lines.push(`💬 Izoh: ${escapeHtml(order.comment)}`);
  return lines.join('\n');
}

export function buildShopInfo() {
  const s = config.shop;
  return [
    `<b>🏪 ${escapeHtml(s.name)}</b>`,
    "Uy-ro'zg'or va xo'jalik mollari do'koni",
    '',
    `📞 Telefon: ${escapeHtml(s.phone)}`,
    `🕘 Ish vaqti: ${escapeHtml(s.workHours)}`,
    `🚚 Yetkazib berish: ${money(s.deliveryFee)}`,
    `🎁 ${money(s.freeDeliveryFrom)} dan yuqori buyurtmalarga — bepul`,
    `🛒 Minimal buyurtma: ${money(s.minOrder)}`,
  ].join('\n');
}
