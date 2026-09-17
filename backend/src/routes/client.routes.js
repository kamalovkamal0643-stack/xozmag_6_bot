import { Router } from 'express';
import { cartController as c } from '../controllers/cartController.js';
import { telegramAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler as h } from '../utils/helpers.js';

const router = Router();

router.use(telegramAuth);

router.post('/auth', h(c.auth));
router.get('/home', h(c.home));
router.get('/categories', h(c.categories));
router.get('/products', h(c.products));
router.get('/products/:id', h(c.product));
router.get('/upsell', h(c.upsell));
router.post('/cart/sync', h(c.syncCart));
router.post('/orders', h(c.createOrder));
router.get('/orders', h(c.myOrders));
router.patch('/profile', h(c.updateProfile));

export default router;
