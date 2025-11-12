# ---------- base para construir (com deps de dev p/ gerar Prisma) ----------
FROM node:20-alpine AS builder
WORKDIR /app

# lib necessárias para Prisma em alpine
RUN apk add --no-cache libc6-compat openssl

# instala dependências (usa cache quando só package*.json muda)
COPY package*.json ./
RUN npm ci

# copia código e gera Prisma Client
COPY . .
# Se seu schema estiver em /backend/prisma, o contexto já está correto
RUN npx prisma generate

# ---------- imagem final, só com prod deps ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl

# copia apenas o necessário
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# porta da API
EXPOSE 3001

# healthcheck (a rota /health precisa existir no seu app)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# start
# Se seu entrypoint for outro (ex.: dist/server.js), ajuste aqui
CMD ["node", "src/server.js"]
