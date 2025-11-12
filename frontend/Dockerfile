# Multi‑stage Dockerfile for building and serving the PCSC‑IA front‑end.
#
# The build stage runs `npm run build` to compile the React/Vite
# application.  Build‑time environment variables starting with
# `VITE_` (e.g. VITE_API_BASE_URL) are defined in the EasyPanel
# Build Environment and injected via ARG statements.  The runtime
# stage serves the compiled assets via nginx with a fallback to
# `index.html` for SPA routes.

# -------- Stage 1: Build the Vite application --------
FROM node:20-alpine AS build
WORKDIR /app

# Copy package descriptors and install dependencies.  Using `npm ci`
# ensures reproducibility and takes advantage of Docker layer caching.
COPY package*.json ./
RUN npm ci

# Copy the application source code.
COPY . .

# Declare build arguments for Vite.  EasyPanel will populate these
# during the build process.  They are turned into environment
# variables before running the build command.  Without these
# statements the variables would be empty and the bundle would not
# reference the correct API or Google client ID.
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Build the production bundle.  Vite uses the environment variables
# prefixed with `VITE_` at build time to substitute into the code.
RUN npm run build


# -------- Stage 2: Serve the static files via nginx --------
FROM nginx:alpine AS runtime

# Copy our custom nginx configuration.  This configuration enables
# SPA fallback: any request that does not match a static asset is
# served `index.html` to allow React Router to handle client‑side
# routing.  Gzip is enabled for better performance.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled app from the build stage to the nginx html
# directory.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for the web server.
EXPOSE 80

# Run nginx in the foreground.  The `-g` flag prevents nginx from
# daemonising and ensures the container logs are surfaced.
CMD ["nginx", "-g", "daemon off;"]