import { isAdminConfigured } from '../config/default.js';
import { ProductModel } from '../models/Product.js';
import { OrderModel } from '../models/Order.js';
import { CategoryModel } from '../models/Category.js';
import { UserModel } from '../models/User.js';
import { checkAdminPassword, createAdminToken } from '../middlewares/auth.middleware.js';
import { notifyStatusChanged } from '../services/notify.service.js';
import { AppError, ok, toInt, startOfDay, startOfMonth, formatDateTime, STATUS_LABELS } from '../utils/helpers.js';

const ORDER_STATUSES = ['NEW', 'CONFIRMED', 'DELIVERING', 'DELIVERED', 'CANCELLED'];
const MOVE_TYPES = ['IN', 'OUT', 'WRITEOFF', 'RETURN', 'ADJUST'];

const loginAttempts = new Map();
const LOCK_MS = 10 * 60 * 1000;

function guardLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (entry && entry.until > Date.now() && entry.count >= 5) {
    throw new AppError("Juda ko'p noto'g'ri urinish. 10 daqiqadan so'ng qayta urining", 429);
  }
}

function registerFail(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.until < Date.now()) loginAttempts.set(ip, { count: 1, until: Date.now() + LOCK_MS });
  else entry.count += 1;
}

function parseProduct(body = {}) {
  const name = String(body.name || '').trim();
  const price = toInt(body.price, -1);
  const oldPrice = body.oldPrice === '' || body.oldPrice === null || body.oldPrice === undefined ? null : toInt(body.oldPrice, -1);
  const categoryId = toInt(body.categoryId, 0);
  const imageUrl = String(body.imageUrl || '').trim();

  if (name.length < 2) throw new AppError('Mahsulot nomini kiriting');
  if (price < 0) throw new AppError("Narxni to'g'ri kiriting");
  if (oldPrice !== null && oldPrice <= price) throw new AppError("Eski narx yangi narxdan katta bo'lishi kerak (yoki bo'sh qoldiring)");
  if (!categoryId) throw new AppError('Kategoriyani tanlang');
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) throw new AppError('Rasm manzili http:// yoki https:// bilan boshlanishi kerak');

  return {
    name: name.slice(0, 120),
    description: String(body.description || '').trim().slice(0, 2000),
    imageUrl: imageUrl.slice(0, 1000),
    emoji: String(body.emoji || '').trim().slice(0, 8) || '📦',
    price,
    oldPrice,
    unit: String(body.unit || '').trim().slice(0, 20) || 'dona',
    sku: String(body.sku || '').trim().toUpperCase().slice(0, 40) || `HZ-${Date.now().toString().slice(-6)}`,
    minStock: Math.max(0, toInt(body.minStock, 5)),
    isActive: body.isActive !== false && body.isActive !== 'false',
    categoryId,
  };
}

function parseCategory(body = {}) {
  const name = String(body.name || '').trim();
  if (name.length < 2) throw new AppError('Kategoriya nomini kiriting');
  const slug =
    String(body.slug || name)
      .toLowerCase()
      .replace(/[ʻʼ'`‘’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `kategoriya-${Date.now()}`;
  return {
    name: name.slice(0, 60),
    slug: slug.slice(0, 60),
    emoji: String(body.emoji || '').trim().slice(0, 8) || '📦',
    sortOrder: toInt(body.sortOrder, 0),
  };
}

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const adminController = {
  async login(req, res) {
    if (!isAdminConfigured()) {
      throw new AppError('Admin panel sozlanmagan: serverda ADMIN_PASSWORD va ADMIN_SECRET kerak', 503);
    }
    const ip = req.ip || 'local';
    guardLogin(ip);
    if (!checkAdminPassword(String(req.body?.password || ''))) {
      registerFail(ip);
      throw new AppError("Parol noto'g'ri", 401);
    }
    loginAttempts.delete(ip);
    ok(res, { token: createAdminToken() });
  },

  async me(req, res) {
    ok(res, { role: 'admin' });
  },

  async dashboard(req, res) {
    const today = startOfDay();
    const yesterday = startOfDay(new Date(), 1);

    const [todaySum, yesterdaySum, monthSum, week, statuses, inventory, lowStock, topProducts, recent, hourly, customers, newCustomers] =
      await Promise.all([
        OrderModel.summary(today),
        OrderModel.summary(yesterday, today),
        OrderModel.summary(startOfMonth()),
        OrderModel.revenueByDay(7),
        OrderModel.statusCounts(),
        ProductModel.inventorySummary(),
        ProductModel.lowStock(8),
        OrderModel.topProducts(startOfDay(new Date(), 29), 5),
        OrderModel.listForAdmin({ page: 1, pageSize: 6 }),
        OrderModel.hourlyToday(),
        UserModel.count(),
        UserModel.count({ createdAt: { gte: today } }),
      ]);

    ok(res, {
      today: { ...todaySum, newCustomers },
      yesterday: yesterdaySum,
      month: monthSum,
      week,
      hourly,
      statuses,
      inventory,
      lowStock,
      topProducts,
      recentOrders: recent.orders,
      customers,
    });
  },

  async orders(req, res) {
    const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    ok(
      res,
      await OrderModel.listForAdmin({
        status,
        q: String(req.query.q || '').trim() || undefined,
        period: ['today', 'week', 'month'].includes(req.query.period) ? req.query.period : undefined,
        page: Math.max(1, toInt(req.query.page, 1)),
        pageSize: Math.min(100, Math.max(5, toInt(req.query.pageSize, 20))),
      })
    );
  },

  async order(req, res) {
    const order = await OrderModel.findById(toInt(req.params.id));
    if (!order) throw new AppError('Buyurtma topilmadi', 404);
    ok(res, order);
  },

  async updateOrderStatus(req, res) {
    const status = req.body?.status;
    if (!ORDER_STATUSES.includes(status)) throw new AppError("Holat noto'g'ri");
    const order = await OrderModel.updateStatus(toInt(req.params.id), status);
    notifyStatusChanged(order).catch(() => {});
    ok(res, order);
  },

  async exportOrders(req, res) {
    const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const period = ['today', 'week', 'month'].includes(req.query.period) ? req.query.period : undefined;
    const orders = await OrderModel.listForExport({ status, period });

    const header = ['Raqam', 'Sana', 'Holat', 'Mijoz', 'Telefon', 'Manzil', 'Mahsulotlar', 'Mahsulotlar summasi', 'Yetkazish', 'Jami', "To'lov"];
    const rows = orders.map((o) => [
      o.number,
      formatDateTime(o.createdAt),
      STATUS_LABELS[o.status].replace(/^\S+\s/, ''),
      [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' '),
      o.phone,
      o.address,
      o.items.map((i) => `${i.name} x${i.quantity}`).join(', '),
      o.subtotal,
      o.deliveryFee,
      o.total,
      o.paymentType === 'CARD' ? 'Karta' : 'Naqd',
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`﻿${csv}`);
  },

  async products(req, res) {
    ok(
      res,
      await ProductModel.listForAdmin({
        q: String(req.query.q || '').trim() || undefined,
        categoryId: toInt(req.query.categoryId, 0) || undefined,
        filter: req.query.filter,
      })
    );
  },

  async createProduct(req, res) {
    const data = parseProduct(req.body);
    const initialStock = Math.max(0, toInt(req.body?.stock, 0));
    ok(res, await ProductModel.create(data, initialStock), 201);
  },

  async updateProduct(req, res) {
    ok(res, await ProductModel.update(toInt(req.params.id), parseProduct(req.body)));
  },

  async deleteProduct(req, res) {
    await ProductModel.remove(toInt(req.params.id));
    ok(res, { deleted: true });
  },

  async adjustStock(req, res) {
    const type = req.body?.type;
    const quantity = toInt(req.body?.quantity, -1);
    if (!MOVE_TYPES.includes(type)) throw new AppError("Harakat turini tanlang");
    if (quantity < 0 || (type !== 'ADJUST' && quantity === 0)) throw new AppError("Miqdorni to'g'ri kiriting");
    const note = String(req.body?.note || '').trim().slice(0, 200);
    ok(res, await ProductModel.adjustStock(toInt(req.params.id), { type, quantity, note }));
  },

  async movements(req, res) {
    ok(
      res,
      await ProductModel.movements({
        productId: toInt(req.query.productId, 0) || undefined,
        type: MOVE_TYPES.includes(req.query.type) ? req.query.type : undefined,
      })
    );
  },

  async categories(req, res) {
    ok(res, await CategoryModel.list());
  },

  async createCategory(req, res) {
    ok(res, await CategoryModel.create(parseCategory(req.body)), 201);
  },

  async updateCategory(req, res) {
    ok(res, await CategoryModel.update(toInt(req.params.id), parseCategory(req.body)));
  },

  async deleteCategory(req, res) {
    const result = await CategoryModel.remove(toInt(req.params.id));
    if (!result.removed) {
      throw new AppError(`Bu kategoriyada ${result.count} ta mahsulot bor. Avval ularni boshqa kategoriyaga o'tkazing`, 409);
    }
    ok(res, { deleted: true });
  },

  async customers(req, res) {
    ok(res, await UserModel.listForAdmin({ q: String(req.query.q || '').trim() || undefined }));
  },
};
