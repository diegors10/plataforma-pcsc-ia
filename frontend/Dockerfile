# ---------- build (Vite) ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

# As variáveis Vite precisam existir no AMBIENTE DE BUILD
# O EasyPanel injeta envs no build. Para compatibilidade, mapeamos ARG->ENV.
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

# ---------- servidor estático (nginx) ----------
FROM nginx:alpine
# nginx conf com SPA fallback
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
