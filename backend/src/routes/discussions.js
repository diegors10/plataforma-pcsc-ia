import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  getAllDiscussions,
  getDiscussionById,
  createDiscussion,
  getPostsByDiscussion,
  updateDiscussion,
  deleteDiscussion
} from '../controllers/discussionsController.js';

const router = express.Router();

/* =========================
 * Validações
 * ========================= */
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
    .withMessage('Ordenação deve ser: recent, views ou posts'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Parâmetro search não pode ser vazio'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Parâmetro category não pode ser vazio'),
  query('pinned')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Parâmetro pinned deve ser true ou false')
];

const postsQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page deve ser inteiro >= 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit entre 1 e 100'),
  query('sort')
    .optional()
    .isIn(['recent', 'popular', 'comments'])
    .withMessage('sort deve ser: recent, popular ou comments')
];

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
    .withMessage('Categoria deve ter entre 2 e 255 caracteres'),
  body('e_aberta')
    .optional()
    .isBoolean()
    .withMessage('Campo de status da discussão deve ser verdadeiro ou falso')
    .toBoolean()
];

const updateDiscussionValidation = [
  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Título deve ter entre 5 e 255 caracteres'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),
  body('categoria')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Categoria deve ter entre 2 e 255 caracteres'),
  body('e_aberta')
    .optional()
    .isBoolean()
    .withMessage('e_aberta deve ser verdadeiro ou falso')
    .toBoolean(),
  body('esta_fixado')
    .optional()
    .isBoolean()
    .withMessage('esta_fixado deve ser verdadeiro ou falso')
    .toBoolean(),
  body('esta_bloqueado')
    .optional()
    .isBoolean()
    .withMessage('esta_bloqueado deve ser verdadeiro ou falso')
    .toBoolean()
];

/* =========================
 * Rotas públicas
 * ========================= */
router.get(
  '/',
  optionalAuth,
  queryValidation,
  handleValidationErrors,
  getAllDiscussions
);

// >>> A rota de posts da discussão precisa vir ANTES de '/:id'
router.get(
  '/:id/posts',
  optionalAuth,
  idValidation,
  postsQueryValidation,
  handleValidationErrors,
  getPostsByDiscussion
);

router.get(
  '/:id',
  optionalAuth,
  idValidation,
  handleValidationErrors,
  getDiscussionById
);

/* =========================
 * Rotas protegidas
 * ========================= */
router.post(
  '/',
  authenticateToken,
  sanitizeInput,
  createDiscussionValidation,
  handleValidationErrors,
  createDiscussion
);

router.put(
  '/:id',
  authenticateToken,
  sanitizeInput,
  idValidation,
  updateDiscussionValidation,
  handleValidationErrors,
  updateDiscussion
);

router.delete(
  '/:id',
  authenticateToken,
  idValidation,
  handleValidationErrors,
  deleteDiscussion
);

export default router;
