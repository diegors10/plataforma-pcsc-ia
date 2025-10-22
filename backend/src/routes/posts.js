import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import {
  createPost,
  updatePost,
  deletePost,
  likePost,
} from '../controllers/postsController.js';
import { getPostsByDiscussion } from '../controllers/discussionsController.js';

const router = express.Router();

// Validações
const discussionIdParam = [
  param('id').isInt({ min: 1 }).withMessage('ID da discussão deve ser um inteiro positivo')
];

const postIdParam = [
  param('postId').isInt({ min: 1 }).withMessage('ID da postagem deve ser um inteiro positivo')
];

const postContentValidation = [
  body('conteudo')
    .trim()
    .isLength({ min: 3, max: 5000 })
    .withMessage('Conteúdo deve ter entre 3 e 5000 caracteres')
];

// Rotas
// GET posts da discussão (usa controller em discussionsController; param esperado: :id)
router.get(
  '/discussions/:id/posts',
  optionalAuth,
  discussionIdParam,
  handleValidationErrors,
  getPostsByDiscussion
);

// Criar novo post na discussão (postsController.createPost espera param :id)
router.post(
  '/discussions/:id/posts',
  authenticateToken,
  sanitizeInput,
  discussionIdParam,
  postContentValidation,
  handleValidationErrors,
  createPost
);

// Atualizar post (postsController.updatePost espera param :postId)
router.put(
  '/posts/:postId',
  authenticateToken,
  sanitizeInput,
  postIdParam,
  postContentValidation,
  handleValidationErrors,
  updatePost
);

// Excluir post (postsController.deletePost espera param :postId)
router.delete(
  '/posts/:postId',
  authenticateToken,
  postIdParam,
  handleValidationErrors,
  deletePost
);

// Curtir/Descurtir post (postsController.likePost espera param :postId)
router.post(
  '/posts/:postId/like',
  authenticateToken,
  postIdParam,
  handleValidationErrors,
  likePost
);

export default router;
