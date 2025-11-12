# Multi-stage Dockerfile for building and serving the PCSC-IA front-end.

# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copia .npmrc para garantir legacy-peer-deps no ambiente de build
# (se o arquivo existir no repo; não quebra se não existir)
# Dica: mantenha esse arquivo versionado no frontend/.
COPY .npmrc .npmrc

# Vite injeta somente variáveis que começam com VITE_
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Instala dependências com lockfile, ignorando peer deps (React 19 x react-day-picker 8)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copia o restante do código e compila
COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Remove o default e copia a nossa config SPA
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os artefatos compilados
COPY --from=build /app/dist ./

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
