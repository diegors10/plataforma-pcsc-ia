import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  getAllDiscussions,
  getDiscussionById,
  createDiscussion
} from '../controllers/discussionsController.js';

const router = express.Router();

// Validações
const createDiscussionValidation = [
  body('titulo')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Título deve ter entre 5 e 255 caracteres'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Categoria deve ter entre 2 e 255 caracteres')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  query('sort')
    .optional()
    .isIn(['recent', 'views', 'posts'])
    .withMessage('Ordenação deve ser: recent, views ou posts')
];

// Rotas públicas
router.get(
  '/',
  optionalAuth,
  queryValidation,
  handleValidationErrors,
  getAllDiscussions
);

router.get(
  '/:id',
  optionalAuth,
  idValidation,
  handleValidationErrors,
  getDiscussionById
);

// Rotas protegidas
router.post(
  '/',
  authenticateToken,
  sanitizeInput,
  createDiscussionValidation,
  handleValidationErrors,
  createDiscussion
);

export default router;