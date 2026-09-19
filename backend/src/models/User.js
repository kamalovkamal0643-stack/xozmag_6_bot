import { prisma } from '../database/connection.js';

export const UserModel = {
  upsertFromTelegram(tgUser, extra = {}) {
    const telegramId = String(tgUser.id);
    const data = {
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || null,
      username: tgUser.username || null,
      ...extra,
    };
    return prisma.user.upsert({
      where: { telegramId },
      update: data,
      create: { telegramId, ...data },
    });
  },

  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  updateContact(userId, { phone, address }) {
    const data = {};
    if (phone) data.phone = phone;
    if (address) data.address = address;
    return prisma.user.update({ where: { id: userId }, data });
  },

  async profileStats(userId) {
    const agg = await prisma.order.aggregate({
      where: { userId, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { total: true },
    });
    return { ordersCount: agg._count._all, totalSpent: agg._sum.total || 0 };
  },

  async listForAdmin({ q } = {}) {
    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { telegramId: { contains: q } },
          ],
        }
      : {};

    const [users, totals] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.order.groupBy({
        by: ['userId'],
        where: { status: { not: 'CANCELLED' } },
        _count: { _all: true },
        _sum: { total: true },
        _max: { createdAt: true },
      }),
    ]);

    const map = new Map(totals.map((t) => [t.userId, t]));
    return users.map((u) => {
      const t = map.get(u.id);
      return {
        ...u,
        ordersCount: t?._count._all || 0,
        totalSpent: t?._sum.total || 0,
        lastOrderAt: t?._max.createdAt || null,
      };
    });
  },

  count(where = {}) {
    return prisma.user.count({ where });
  },
};
