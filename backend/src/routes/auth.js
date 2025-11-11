import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors, sanitizeInput } from '../middleware/validation.js';
import { register, login, getMe, logout, googleLogin } from '../controllers/authController.js';

const router = express.Router();

// Validações
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  body('nome')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nome deve ter entre 2 e 255 caracteres'),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('departamento')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Departamento deve ter no máximo 255 caracteres'),
  body('cargo')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Cargo deve ter no máximo 255 caracteres'),
  body('matricula')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Matrícula deve ter no máximo 255 caracteres'),
  body('telefone')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Telefone deve ter no máximo 255 caracteres'),
  body('localizacao')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Localização deve ter no máximo 255 caracteres'),
  body('biografia')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Biografia deve ter no máximo 1000 caracteres')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  body('senha')
    .notEmpty()
    .withMessage('Senha é obrigatória')
];

// Rotas
router.post('/register', 
  sanitizeInput,
  registerValidation,
  handleValidationErrors,
  register
);

router.post('/login',
  sanitizeInput,
  loginValidation,
  handleValidationErrors,
  login
);

router.get('/me',
  authenticateToken,
  getMe
);

router.post('/logout',
  authenticateToken,
  logout
);

// Login via Google OAuth
router.post('/google',
  googleLogin
);

export default router;
