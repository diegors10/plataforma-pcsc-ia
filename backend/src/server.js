// backend/src/server.js (trecho relevante)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import promptsRoutes from './routes/prompts.js';
import commentsRoutes from './routes/comments.js';
import discussionsRoutes from './routes/discussions.js';
import postsRoutes from './routes/posts.js';
import specialtiesRoutes from './routes/specialties.js';
import usersRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';

import { globalRateLimit } from './middleware/rateLimit.js';

dotenv.config();

const app = express();                // <- CRIA PRIMEIRO
const PORT = process.env.PORT || 3001;

// BigInt -> number
app.set('json replacer', (k, v) => (typeof v === 'bigint' ? Number(v) : v));

// Segurança
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS (aceita múltiplas origens por vírgula)
const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      return cb(null, allowed.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limit global (depois do app existir)
app.use(globalRateLimit);

// Rate limit sob /api (extra)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logs
app.use(morgan(process.env.NODE_ENV !== 'production' ? 'dev' : 'combined'));

// Body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api', commentsRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api', postsRoutes);
app.use('/api', specialtiesRoutes);
app.use('/api', usersRoutes);
app.use('/api/stats', statsRoutes);

// estáticos
app.use('/uploads', express.static('uploads'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl }));

// erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Payload muito grande' });
  return res.status(500).json({
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => { console.log('Encerrando...'); process.exit(0); });
process.on('SIGINT', () => { console.log('Encerrando...'); process.exit(0); });
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

export default app;
