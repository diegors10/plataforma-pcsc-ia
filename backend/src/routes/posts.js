import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  getPostsByDiscussion,
  createPost,
  updatePost,
  deletePost,
  likePost,
} from '../controllers/postsController.js';

const router = express.Router();

// Validações
const discussionIdParam = [
  param('discussionId').isInt({ min: 1 }).withMessage('ID da discussão deve ser um inteiro positivo')
];

const postIdParam = [
  param('id').isInt({ min: 1 }).withMessage('ID da postagem deve ser um inteiro positivo')
];

const postContentValidation = [
  body('conteudo')
    .trim()
    .isLength({ min: 3, max: 5000 })
    .withMessage('Conteúdo deve ter entre 3 e 5000 caracteres')
];

// Rotas
router.get('/discussions/:discussionId/posts',
  optionalAuth,
  discussionIdParam,
  handleValidationErrors,
  getPostsByDiscussion
);

router.post('/discussions/:discussionId/posts',
  authenticateToken,
  sanitizeInput,
  discussionIdParam,
  postContentValidation,
  handleValidationErrors,
  createPost
);

router.put('/posts/:id',
  authenticateToken,
  sanitizeInput,
  postIdParam,
  postContentValidation,
  handleValidationErrors,
  updatePost
);

router.delete('/posts/:id',
  authenticateToken,
  postIdParam,
  handleValidationErrors,
  deletePost
);

router.post('/posts/:id/like',
  authenticateToken,
  postIdParam,
  handleValidationErrors,
  likePost
);

export default router;