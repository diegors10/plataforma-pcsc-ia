// backend/src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import os from 'os';

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

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// BigInt -> number
app.set('json replacer', (k, v) => (typeof v === 'bigint' ? Number(v) : v));

// Segurança
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ===== CORS robusto (múltiplas origens) =====
const sanitize = (s = '') =>
  s.trim()
   .replace(/^['"]|['"]$/g, '')   // remove aspas acidentais da .env
   .replace(/\/+$/, '');          // remove barras finais

const parseAllowed = (env) =>
  (env || 'http://localhost:5173')
    .split(',')
    .map(sanitize)
    .filter(Boolean);

const allowedList = parseAllowed(process.env.CORS_ORIGIN);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman/CLI
    try {
      const o = new URL(sanitize(origin));
      const ok = allowedList.some(a => {
        const u = new URL(a);
        // compara protocolo + host:porta
        return u.protocol === o.protocol && u.host === o.host;
      });
      return cb(null, ok);
    } catch {
      return cb(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));

// ===== Rate limit =====
app.use(globalRateLimit);

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

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
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

// Arquivos estáticos (garante CORS nos assets)
app.use('/uploads', cors(), express.static('uploads'));

// 404
app.use((req, res) =>
  res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl })
);

// Erros globais
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'JSON inválido' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: 'Payload muito grande' });
  return res.status(500).json({
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
  });
});

// 🚀 Inicialização com exibição do IP local
app.listen(PORT, HOST, () => {
  const networkInterfaces = os.networkInterfaces();
  const localIP = Object.values(networkInterfaces)
    .flat()
    .find((iface) => iface.family === 'IPv4' && !iface.internal)?.address;

  console.log(`\n🚀 Servidor rodando:`);
  console.log(`   ➜ Local:   http://localhost:${PORT}`);
  if (localIP) console.log(`   ➜ Network: http://${localIP}:${PORT}`);
  console.log(`   🔗 Health check: http://${localIP || 'localhost'}:${PORT}/health`);
});

// Eventos de encerramento
process.on('SIGTERM', () => {
  console.log('Encerrando...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('Encerrando...');
  process.exit(0);
});
process.on('unhandledRejection', (reason) =>
  console.error('❌ Unhandled Rejection:', reason)
);

export default app;
