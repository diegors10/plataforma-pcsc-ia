import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const globalRateLimit = rateLimit({
  windowMs: 15 * 1000, // 15s
  max: isDev ? 500 : 100, // bem mais folgado no dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDev) return true; // em dev, pula rate limit global
    // Em produção, ainda liberamos estes endpoints:
    const path = req.path || '';
    return path.startsWith('/api/auth/me') || path.startsWith('/api/stats/dashboard');
  },
});
