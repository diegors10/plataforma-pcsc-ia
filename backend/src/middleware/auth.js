import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.usuarios.findUnique({
      where: { 
        id: decoded.userId,
        esta_ativo: true 
      },
      select: {
        id: true,
        email: true,
        nome: true,
        e_admin: true,
        e_moderador: true,
        esta_ativo: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado ou inativo' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Token inválido' 
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user?.e_admin) {
    return res.status(403).json({ 
      error: 'Acesso negado. Privilégios de administrador requeridos.' 
    });
  }
  next();
};

export const requireModerator = (req, res, next) => {
  if (!req.user?.e_moderador && !req.user?.e_admin) {
    return res.status(403).json({ 
      error: 'Acesso negado. Privilégios de moderador requeridos.' 
    });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.usuarios.findUnique({
      where: { 
        id: decoded.userId,
        esta_ativo: true 
      },
      select: {
        id: true,
        email: true,
        nome: true,
        e_admin: true,
        e_moderador: true,
        esta_ativo: true
      }
    });

    req.user = user;
  } catch (error) {
    req.user = null;
  }
  
  next();
};
