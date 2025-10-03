import multer from 'multer';
import fs from 'fs';
import path from 'path';

/*
 * Middleware de upload de arquivos usando Multer.
 * Define locais de armazenamento separados para avatares de usuários e ícones de especialidades.
 */

// Garante que o diretório exista
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configuração de armazenamento para avatares de usuários
const avatarsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join('uploads', 'avatars');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configuração de armazenamento para ícones de especialidades
const iconsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join('uploads', 'specialties');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Exporta middlewares específicos para cada tipo de upload
export const uploadAvatar = multer({
  storage: avatarsStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo para avatar
}).single('avatar');

export const uploadIcon = multer({
  storage: iconsStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB máximo para ícones
}).single('icon');