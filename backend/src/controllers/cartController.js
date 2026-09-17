import { config } from '../config/default.js';
import { ProductModel } from '../models/Product.js';
import { OrderModel } from '../models/Order.js';
import { CategoryModel, StoryModel } from '../models/Category.js';
import { UserModel } from '../models/User.js';
import { notifyOrderCreated } from '../services/notify.service.js';
import { AppError, ok, toInt } from '../utils/helpers.js';

const PHONE_RE = /^\+?\d[\d\s()-]{8,18}$/;

const optionalNumber = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));

export const cartController = {
  async auth(req, res) {
    const user = await UserModel.upsertFromTelegram(req.tgUser);
    const stats = await UserModel.profileStats(user.id);
    ok(res, { user, stats, shop: config.shop });
  },

  async home(req, res) {
    const [stories, popular, categories] = await Promise.all([
      StoryModel.listActive(),
      ProductModel.popular(8),
      CategoryModel.list(),
    ]);
    ok(res, { stories, popular, categories });
  },

  async categories(req, res) {
    ok(res, await CategoryModel.list());
  },

  async products(req, res) {
    const category = String(req.query.category || '').trim() || undefined;
    const q = String(req.query.q || '').trim().slice(0, 50) || undefined;
    ok(res, await ProductModel.listForClient({ category, q }));
  },

  async product(req, res) {
    const product = await ProductModel.findById(toInt(req.params.id));
    if (!product || !product.isActive) throw new AppError('Mahsulot topilmadi', 404);
    ok(res, product);
  },

  async upsell(req, res) {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map(Number)
      .filter(Number.isInteger);
    ok(res, await ProductModel.upsell(exclude));
  },

  async syncCart(req, res) {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger).slice(0, 100);
    ok(res, ids.length ? await ProductModel.byIds(ids) : []);
  },

  async createOrder(req, res) {
    const { items, phone, address, latitude, longitude, comment, paymentType } = req.body || {};

    if (!Array.isArray(items) || !items.length) throw new AppError("Savatcha bo'sh", 400);

    const cleanPhone = String(phone || '').trim();
    if (!PHONE_RE.test(cleanPhone)) throw new AppError("Telefon raqamini to'g'ri kiriting", 400);

    const cleanAddress = String(address || '').trim().slice(0, 300);
    const lat = optionalNumber(latitude);
    const lng = optionalNumber(longitude);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
    if (!cleanAddress && !hasGeo) throw new AppError('Yetkazish manzilini kiriting', 400);

    const order = await OrderModel.create({
      userId: req.user.id,
      items: items.slice(0, 50),
      phone: cleanPhone,
      address: cleanAddress,
      latitude: hasGeo ? lat : undefined,
      longitude: hasGeo ? lng : undefined,
      comment: String(comment || '').trim().slice(0, 500),
      paymentType,
    });

    await UserModel.updateContact(req.user.id, { phone: cleanPhone, address: cleanAddress });
    notifyOrderCreated(order).catch((err) => console.error('❌ Bildirishnoma xatosi:', err.message));

    ok(res, order, 201);
  },

  async myOrders(req, res) {
    ok(res, await OrderModel.listForUser(req.user.id));
  },

  async updateProfile(req, res) {
    const phone = String(req.body?.phone || '').trim();
    const address = String(req.body?.address || '').trim().slice(0, 300);
    if (phone && !PHONE_RE.test(phone)) throw new AppError("Telefon raqamini to'g'ri kiriting", 400);
    ok(res, await UserModel.updateContact(req.user.id, { phone, address }));
  },
};
