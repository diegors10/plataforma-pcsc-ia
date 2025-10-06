import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  getCommentsByPrompt,
  createComment,
  updateComment,
  deleteComment,
  likeComment
} from '../controllers/commentsController.js';

const router = express.Router();

// Validações
const createCommentValidation = [
  param('promptId')
    .isInt({ min: 1 })
    .withMessage('ID do prompt deve ser um número inteiro positivo'),
  body('conteudo')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Conteúdo deve ter entre 5 e 2000 caracteres'),
  body('comentario_pai_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do comentário pai deve ser um número inteiro positivo')
];

const updateCommentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),
  body('conteudo')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Conteúdo deve ter entre 5 e 2000 caracteres')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo')
];

const promptIdValidation = [
  param('promptId')
    .isInt({ min: 1 })
    .withMessage('ID do prompt deve ser um número inteiro positivo')
];

// Rotas
router.get(
  '/prompts/:promptId/comments',
  optionalAuth,
  promptIdValidation,
  handleValidationErrors,
  getCommentsByPrompt
);

router.post(
  '/prompts/:promptId/comments',
  authenticateToken,
  sanitizeInput,
  createCommentValidation,
  handleValidationErrors,
  createComment
);

router.put(
  '/comments/:id',
  authenticateToken,
  sanitizeInput,
  updateCommentValidation,
  handleValidationErrors,
  updateComment
);

router.delete(
  '/comments/:id',
  authenticateToken,
  idValidation,
  handleValidationErrors,
  deleteComment
);

// Like aceita anônimo (optionalAuth)
router.post(
  '/comments/:id/like',
  optionalAuth,              // <- alterado
  idValidation,
  handleValidationErrors,
  likeComment
);

export default router;
