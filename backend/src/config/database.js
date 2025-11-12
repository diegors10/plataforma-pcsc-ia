import { PrismaClient } from '@prisma/client';

/**
 * Instancia única do Prisma para todo o processo.
 *
 * Em produção anteriormente era criada uma nova instância do PrismaClient,
 * o que podia abrir várias conexões com o Postgres quando o servidor tinha
 * múltiplos workers. Para evitar esse problema usamos uma variável global
 * (globalThis.__prisma) e reaproveitamos o client quando disponível.
 */
let prisma;

if (!globalThis.__prisma) {
  // logs somente em desenvolvimento; em produção usar defaults para evitar overhead
  const prismaOptions = process.env.NODE_ENV !== 'production'
    ? { log: ['query', 'info', 'warn', 'error'] }
    : {};
  globalThis.__prisma = new PrismaClient(prismaOptions);
}
prisma = globalThis.__prisma;

export default prisma;
