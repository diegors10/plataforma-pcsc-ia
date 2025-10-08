import { Router } from 'express';
import {
  getDashboardStats,
  getPromptsStats,
  getCategoriesStats,
} from '../controllers/statsController.js';

// Stats router defines endpoints for aggregated statistics.
const router = Router();

// Dashboard stats (totals, top prompts, categories, activities)
router.get('/dashboard', getDashboardStats);

// Simple prompts stats (total, public, approved, featured)
router.get('/prompts', getPromptsStats);

// Categories stats (number of prompts per category)
router.get('/categories', getCategoriesStats);

export default router;