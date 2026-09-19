import { prisma } from '../database/connection.js';
import { config } from '../config/default.js';
import { AppError, startOfDay, localDateKey, money } from '../utils/helpers.js';

const include = { items: true, user: true };

async function nextOrderNumber(tx) {
  const today = startOfDay();
  const count = await tx.order.count({ where: { createdAt: { gte: today } } });
  const key = localDateKey(new Date()).slice(2).replace(/-/g, '');
  return `${key}-${String(count + 1).padStart(3, '0')}`;
}

export function calcDelivery(subtotal) {
  return subtotal >= config.shop.freeDeliveryFrom ? 0 : config.shop.deliveryFee;
}

export const OrderModel = {
  async create(payload) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await OrderModel.createOnce(payload);
      } catch (err) {
        if (err?.code !== 'P2002' || attempt >= 3) throw err;
      }
    }
  },

  async createOnce({ userId, items, phone, address, latitude, longitude, comment, paymentType }) {
    const merged = new Map();
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) continue;
      merged.set(productId, (merged.get(productId) || 0) + quantity);
    }
    if (!merged.size) throw new AppError("Savatcha bo'sh", 400);

    return prisma.$transaction(
      async (tx) => {
        const products = await tx.product.findMany({ where: { id: { in: [...merged.keys()] } } });
        const byId = new Map(products.map((p) => [p.id, p]));

        const orderItems = [];
        let subtotal = 0;
        for (const [productId, quantity] of merged) {
          const p = byId.get(productId);
          if (!p || !p.isActive) throw new AppError('Savatchadagi mahsulotlardan biri sotuvda yo\'q', 409);
          if (p.stock < quantity) {
            throw new AppError(
              p.stock > 0
                ? `"${p.name}" dan omborda faqat ${p.stock} ${p.unit} qoldi`
                : `"${p.name}" hozircha tugagan`,
              409
            );
          }
          const total = p.price * quantity;
          subtotal += total;
          orderItems.push({
            productId: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            emoji: p.emoji,
            unit: p.unit,
            price: p.price,
            quantity,
            total,
          });
        }

        if (subtotal < config.shop.minOrder) {
          throw new AppError(`Minimal buyurtma summasi — ${money(config.shop.minOrder)}`, 400);
        }

        const deliveryFee = calcDelivery(subtotal);
        const number = await nextOrderNumber(tx);

        for (const item of orderItems) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) throw new AppError(`"${item.name}" boshqa xaridor tomonidan sotib olindi`, 409);

          const before = byId.get(item.productId).stock;
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: item.quantity,
              before,
              after: before - item.quantity,
              note: `Buyurtma #${number}`,
            },
          });
        }

        return tx.order.create({
          data: {
            number,
            userId,
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            phone: phone || '',
            address: address || '',
            latitude: Number.isFinite(latitude) ? latitude : null,
            longitude: Number.isFinite(longitude) ? longitude : null,
            comment: comment || '',
            paymentType: paymentType === 'CARD' ? 'CARD' : 'CASH',
            items: { create: orderItems },
          },
          include,
        });
      },
      { timeout: 20000, maxWait: 10000 }
    );
  },

  listForUser(userId) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  listForTelegramUser(telegramId, take = 5) {
    return prisma.order.findMany({
      where: { user: { telegramId: String(telegramId) } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },

  async listForAdmin({ status, q, period, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (status) where.status = status;
    if (period === 'today') where.createdAt = { gte: startOfDay() };
    if (period === 'week') where.createdAt = { gte: startOfDay(new Date(), 6) };
    if (period === 'month') where.createdAt = { gte: startOfDay(new Date(), 29) };
    if (q) {
      where.OR = [
        { number: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { username: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [orders, total, sum] = await Promise.all([
      prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where: { ...where, status: status || { not: 'CANCELLED' } }, _sum: { total: true } }),
    ]);

    return { orders, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), revenue: sum._sum.total || 0 };
  },

  listForExport({ status, period } = {}) {
    const where = {};
    if (status) where.status = status;
    if (period === 'today') where.createdAt = { gte: startOfDay() };
    if (period === 'week') where.createdAt = { gte: startOfDay(new Date(), 6) };
    if (period === 'month') where.createdAt = { gte: startOfDay(new Date(), 29) };
    return prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: 5000 });
  },

  findById(id) {
    return prisma.order.findUnique({ where: { id }, include });
  },

  async updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new AppError('Buyurtma topilmadi', 404);
      if (order.status === status) throw new AppError('Buyurtma allaqachon shu holatda', 400);
      if (order.status === 'CANCELLED') throw new AppError("Bekor qilingan buyurtmani qayta ochib bo'lmaydi", 400);

      if (status === 'CANCELLED') {
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          await tx.product.update({ where: { id: product.id }, data: { stock: { increment: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: 'RETURN',
              quantity: item.quantity,
              before: product.stock,
              after: product.stock + item.quantity,
              note: `Buyurtma #${order.number} bekor qilindi`,
            },
          });
        }
      }

      return tx.order.update({ where: { id }, data: { status }, include });
    });
  },

  async summary(from, to) {
    const where = { status: { not: 'CANCELLED' }, createdAt: { gte: from, ...(to ? { lt: to } : {}) } };
    const [agg, items] = await Promise.all([
      prisma.order.aggregate({ where, _count: { _all: true }, _sum: { total: true } }),
      prisma.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
    ]);
    const orders = agg._count._all;
    const revenue = agg._sum.total || 0;
    return { orders, revenue, avgCheck: orders ? Math.round(revenue / orders) : 0, itemsSold: items._sum.quantity || 0 };
  },

  async topProducts(from, take = 5) {
    const rows = await prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: { order: { createdAt: { gte: from }, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });
    return rows.map((r) => ({ productId: r.productId, name: r.name, quantity: r._sum.quantity || 0, revenue: r._sum.total || 0 }));
  },

  async revenueByDay(days = 7) {
    const from = startOfDay(new Date(), days - 1);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map();
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = localDateKey(startOfDay(new Date(), i));
      buckets.set(key, { date: key, orders: 0, revenue: 0 });
    }
    for (const o of orders) {
      const bucket = buckets.get(localDateKey(o.createdAt));
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue += o.total;
      }
    }
    return [...buckets.values()];
  },

  async hourlyToday() {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startOfDay() }, status: { not: 'CANCELLED' } },
      select: { createdAt: true },
    });
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
    const offset = config.reports.utcOffsetMinutes * 60 * 1000;
    for (const o of orders) hours[new Date(o.createdAt.getTime() + offset).getUTCHours()].orders += 1;
    return hours;
  },

  async statusCounts() {
    const rows = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const result = { NEW: 0, CONFIRMED: 0, DELIVERING: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const r of rows) result[r.status] = r._count._all;
    return result;
  },
};
