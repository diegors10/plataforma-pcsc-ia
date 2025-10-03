import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Rotas
import authRoutes from './routes/auth.js';
import promptsRoutes from './routes/prompts.js';
import commentsRoutes from './routes/comments.js';
import discussionsRoutes from './routes/discussions.js';
import postsRoutes from './routes/posts.js';
import specialtiesRoutes from './routes/specialties.js';
import usersRoutes from './routes/users.js';

// Variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Converte BigInt para number no JSON
app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? Number(value) : value
);

// Segurança básica
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting (aplicado sob /api)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logs
app.use(morgan(process.env.NODE_ENV !== 'production' ? 'dev' : 'combined'));

// Body parsing (antes das rotas)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api', commentsRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api', postsRoutes);
app.use('/api', specialtiesRoutes);
app.use('/api', usersRoutes);

// Arquivos estáticos (se necessário)
app.use('/uploads', express.static('uploads'));

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
  });
});

// Handler global de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande' });
  }

  return res.status(500).json({
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `🌐 CORS habilitado para: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`
    );
  }
});

// Encerramento gracioso
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM. Encerrando servidor graciosamente...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT. Encerrando servidor graciosamente...');
  process.exit(0);
});

// Loga rejeições não tratadas (ajuda a diagnosticar 500 silenciosos)
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

export default app;
