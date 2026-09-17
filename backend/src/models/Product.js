import { prisma } from '../database/connection.js';
import { AppError, startOfDay } from '../utils/helpers.js';

const include = { category: true };
const orderBy = [{ category: { sortOrder: 'asc' } }, { name: 'asc' }];

const searchFilter = (q) =>
  q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

export const ProductModel = {
  async listForClient({ category, q } = {}) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category: { slug: category } } : {}),
        ...searchFilter(q),
      },
      include,
      orderBy,
    });
    return products.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  },

  findById(id) {
    return prisma.product.findUnique({ where: { id }, include });
  },

  byIds(ids) {
    return prisma.product.findMany({ where: { id: { in: ids } }, include });
  },

  async popular(limit = 8) {
    const top = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        order: { createdAt: { gte: startOfDay(new Date(), 29) }, status: { not: 'CANCELLED' } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const ids = top.map((t) => t.productId);
    const found = ids.length
      ? await prisma.product.findMany({ where: { id: { in: ids }, isActive: true, stock: { gt: 0 } }, include })
      : [];
    const sorted = ids.map((id) => found.find((p) => p.id === id)).filter(Boolean);
    if (sorted.length >= 4) return sorted;

    const discounted = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 }, oldPrice: { not: null }, id: { notIn: sorted.map((p) => p.id) } },
      include,
      orderBy: { updatedAt: 'desc' },
      take: limit - sorted.length,
    });
    return [...sorted, ...discounted];
  },

  upsell(excludeIds = []) {
    return prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 0 }, price: { lte: 15000 }, id: { notIn: excludeIds } },
      include,
      orderBy: { price: 'asc' },
    });
  },

  listForAdmin({ q, categoryId, filter } = {}) {
    const where = { ...searchFilter(q) };
    if (categoryId) where.categoryId = categoryId;
    if (filter === 'low') where.AND = [{ stock: { lte: prisma.product.fields.minStock } }, { stock: { gt: 0 } }];
    if (filter === 'out') where.stock = { lte: 0 };
    if (filter === 'hidden') where.isActive = false;
    return prisma.product.findMany({ where, include, orderBy });
  },

  lowStock(limit = 50) {
    return prisma.product.findMany({
      where: { isActive: true, stock: { lte: prisma.product.fields.minStock } },
      include,
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      take: limit,
    });
  },

  async inventorySummary() {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      select: { price: true, stock: true, minStock: true },
    });
    return rows.reduce(
      (acc, p) => {
        acc.products += 1;
        acc.units += Math.max(p.stock, 0);
        acc.value += Math.max(p.stock, 0) * p.price;
        if (p.stock <= 0) acc.outOfStock += 1;
        else if (p.stock <= p.minStock) acc.lowStock += 1;
        return acc;
      },
      { products: 0, units: 0, value: 0, outOfStock: 0, lowStock: 0 }
    );
  },

  async create(data, initialStock = 0) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...data, stock: initialStock }, include });
      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: { productId: product.id, type: 'IN', quantity: initialStock, before: 0, after: initialStock, note: 'Yangi mahsulot' },
        });
      }
      return product;
    });
  },

  update(id, data) {
    return prisma.product.update({ where: { id }, data, include });
  },

  remove(id) {
    return prisma.product.delete({ where: { id } });
  },

  async adjustStock(id, { type, quantity, note = '' }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new AppError('Mahsulot topilmadi', 404);

      const before = product.stock;
      let after;
      if (type === 'IN' || type === 'RETURN') after = before + quantity;
      else if (type === 'OUT' || type === 'WRITEOFF') after = before - quantity;
      else if (type === 'ADJUST') after = quantity;
      else throw new AppError("Harakat turi noto'g'ri", 400);

      if (after < 0) throw new AppError(`Omborda faqat ${before} ${product.unit} bor`, 400);

      const updated = await tx.product.update({ where: { id }, data: { stock: after }, include });
      await tx.stockMovement.create({
        data: { productId: id, type, quantity: Math.abs(after - before), before, after, note },
      });
      return updated;
    });
  },

  movements({ productId, type, take = 200 } = {}) {
    return prisma.stockMovement.findMany({
      where: { ...(productId ? { productId } : {}), ...(type ? { type } : {}) },
      include: { product: { select: { id: true, name: true, unit: true, emoji: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  },
};
