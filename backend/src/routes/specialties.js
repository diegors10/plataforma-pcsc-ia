import express from 'express';
import { body, param } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import { uploadIcon } from '../middleware/upload.js';
import {
  getAllSpecialties,
  getSpecialtyById,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty
} from '../controllers/specialtiesController.js';

const router = express.Router();

// Validações
const specialtyIdParam = [
  param('id').isInt({ min: 1 }).withMessage('ID deve ser um inteiro positivo')
];

const createSpecialtyValidation = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome deve ter entre 2 e 255 caracteres'),
  body('descricao')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
  body('cor')
    .optional()
    .isHexColor()
    .withMessage('Cor deve ser um código hexadecimal válido')
];

// Lista todas as especialidades
router.get('/specialties', getAllSpecialties);

// Busca uma especialidade específica
router.get('/specialties/:id', specialtyIdParam, handleValidationErrors, getSpecialtyById);

// Cria uma nova especialidade (apenas admins)
router.post('/specialties',
  authenticateToken,
  requireAdmin,
  uploadIcon,
  sanitizeInput,
  createSpecialtyValidation,
  handleValidationErrors,
  createSpecialty
);

// Atualiza uma especialidade (apenas admins)
router.put('/specialties/:id',
  authenticateToken,
  requireAdmin,
  uploadIcon,
  sanitizeInput,
  specialtyIdParam,
  createSpecialtyValidation,
  handleValidationErrors,
  updateSpecialty
);

// Exclui uma especialidade (apenas admins)
router.delete('/specialties/:id',
  authenticateToken,
  requireAdmin,
  specialtyIdParam,
  handleValidationErrors,
  deleteSpecialty
);

export default router;