import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import { uploadAvatar } from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  getUserById,
  getAllUsers
} from '../controllers/usersController.js';

const router = express.Router();

// Validações
const updateProfileValidation = [
  body('nome').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Nome deve ter entre 2 e 255 caracteres'),
  body('departamento').optional().trim().isLength({ max: 255 }).withMessage('Departamento deve ter no máximo 255 caracteres'),
  body('cargo').optional().trim().isLength({ max: 255 }).withMessage('Cargo deve ter no máximo 255 caracteres'),
  body('telefone').optional().trim().isLength({ max: 50 }).withMessage('Telefone deve ter no máximo 50 caracteres'),
  body('localizacao').optional().trim().isLength({ max: 255 }).withMessage('Localização deve ter no máximo 255 caracteres'),
  body('biografia').optional().trim().isLength({ max: 2000 }).withMessage('Biografia deve ter no máximo 2000 caracteres'),
  body('specialties').optional().isArray().withMessage('Specialties deve ser uma lista de IDs'),
  body('specialties.*').optional().isInt({ min: 1 }).withMessage('ID da especialidade deve ser inteiro positivo')
];

const userIdParam = [
  param('id').isInt({ min: 1 }).withMessage('ID deve ser um inteiro positivo')
];

// Perfil do usuário logado
router.get('/users/profile', authenticateToken, getProfile);

// Atualiza perfil do usuário logado (suporta upload de avatar)
router.put('/users/profile',
  authenticateToken,
  uploadAvatar,
  sanitizeInput,
  updateProfileValidation,
  handleValidationErrors,
  updateProfile
);

// Busca um usuário por ID (dados públicos)
router.get('/users/:id', userIdParam, handleValidationErrors, getUserById);

// Lista todos os usuários (apenas admins)
router.get('/users',
  authenticateToken,
  requireAdmin,
  getAllUsers
);

export default router;