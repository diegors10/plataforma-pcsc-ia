import { Router } from 'express';
import {
  getDashboardStats,
  getPromptsStats,
  getCategoriesStats,
} from '../controllers/statsController.js';

const router = Router();

router.get('/dashboard', getDashboardStats);
router.get('/prompts', getPromptsStats);
router.get('/categories', getCategoriesStats);

export default router;
