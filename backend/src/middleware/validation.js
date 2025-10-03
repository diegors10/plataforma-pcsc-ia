import { validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

export const sanitizeInput = (req, res, next) => {
  // Remover campos vazios e espaços extras
  const sanitizeObject = (obj) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            sanitized[key] = trimmed;
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          const nestedSanitized = sanitizeObject(value);
          if (Object.keys(nestedSanitized).length > 0) {
            sanitized[key] = nestedSanitized;
          }
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};
