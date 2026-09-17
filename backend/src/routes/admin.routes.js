import { Router } from 'express';
import { adminController as c } from '../controllers/adminController.js';
import { adminAuth, localOnly } from '../middlewares/auth.middleware.js';
import { asyncHandler as h } from '../utils/helpers.js';

const router = Router();

router.use(localOnly);
router.post('/login', h(c.login));

router.use(adminAuth);

router.get('/me', h(c.me));
router.get('/dashboard', h(c.dashboard));

router.get('/orders', h(c.orders));
router.get('/orders/export', h(c.exportOrders));
router.get('/orders/:id', h(c.order));
router.patch('/orders/:id/status', h(c.updateOrderStatus));

router.get('/products', h(c.products));
router.post('/products', h(c.createProduct));
router.put('/products/:id', h(c.updateProduct));
router.delete('/products/:id', h(c.deleteProduct));
router.post('/products/:id/stock', h(c.adjustStock));

router.get('/stock/movements', h(c.movements));

router.get('/categories', h(c.categories));
router.post('/categories', h(c.createCategory));
router.put('/categories/:id', h(c.updateCategory));
router.delete('/categories/:id', h(c.deleteCategory));

router.get('/customers', h(c.customers));

export default router;
