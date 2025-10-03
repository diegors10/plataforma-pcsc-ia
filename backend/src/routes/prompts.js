import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  getAllPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
  likePrompt,
  getFeaturedPrompts
} from '../controllers/promptsController.js';

const router = express.Router();

// Validações
const createPromptValidation = [
  body('titulo')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Título deve ter entre 5 e 255 caracteres'),
  body('descricao')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('conteudo')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Conteúdo deve ter pelo menos 20 caracteres'),
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Categoria deve ter entre 2 e 255 caracteres'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deve ser um array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Cada tag deve ter entre 1 e 50 caracteres'),
  body('especialidade_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da especialidade deve ser um número inteiro positivo'),
  body('e_publico')
    .optional()
    .isBoolean()
    .withMessage('Campo público deve ser verdadeiro ou falso')
];

const updatePromptValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),
  ...createPromptValidation
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
    .isIn(['recent', 'popular', 'views'])
    .withMessage('Ordenação deve ser: recent, popular ou views')
];

// Rotas públicas
router.get('/',
  optionalAuth,
  queryValidation,
  handleValidationErrors,
  getAllPrompts
);

router.get('/featured',
  getFeaturedPrompts
);

router.get('/:id',
  optionalAuth,
  idValidation,
  handleValidationErrors,
  getPromptById
);

// Rotas protegidas
router.post('/',
  authenticateToken,
  sanitizeInput,
  createPromptValidation,
  handleValidationErrors,
  createPrompt
);

router.put('/:id',
  authenticateToken,
  sanitizeInput,
  updatePromptValidation,
  handleValidationErrors,
  updatePrompt
);

router.delete('/:id',
  authenticateToken,
  idValidation,
  handleValidationErrors,
  deletePrompt
);

router.post('/:id/like',
  authenticateToken,
  idValidation,
  handleValidationErrors,
  likePrompt
);

export default router;
