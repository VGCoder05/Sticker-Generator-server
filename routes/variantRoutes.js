import { Router } from 'express';
import { listVariants, createVariant, updateVariant, adjustVariantStock, deleteVariant } from '../controllers/variantController.js';
const router = Router();
router.get('/products/:productId/variants', listVariants);
router.post('/products/:productId/variants', createVariant);
router.patch('/products/:productId/variants/:variantId', updateVariant);
router.post('/products/:productId/variants/:variantId/stock', adjustVariantStock);
router.delete('/products/:productId/variants/:variantId', deleteVariant);
export default router;
