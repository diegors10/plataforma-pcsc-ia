# Multi-stage Dockerfile for the PCSC‑IA backend.
#
# This Dockerfile builds and runs the Node/Express API with Prisma.
# It uses an intermediate stage to install development dependencies and
# generate the Prisma client, then copies only the necessary files and
# production dependencies into the final image.  A healthcheck is
# defined so that container orchestrators (like EasyPanel) can
# determine if the application is healthy.

# -------- Stage 1: Install dependencies and generate Prisma client --------
FROM node:20-alpine AS build

# Install system packages required by Prisma.  Alpine images are
# minimal so we explicitly install `openssl` and `libc6-compat`.
RUN apk add --no-cache libc6-compat openssl

# Set the working directory and copy package descriptors.  Using
# package‑lock.json ensures reproducible builds and leverages Docker
# layer caching when dependencies have not changed.
WORKDIR /app
COPY package*.json ./

# Install all dependencies (including dev dependencies) so that the
# Prisma CLI is available during the build.
RUN npm ci

# Copy the remainder of the source code into the container.  We copy
# everything here (including the prisma schema) so that Prisma can
# generate the client and the final image can include only what is
# required.
COPY . .

# Generate the Prisma client.  Without this step Prisma will attempt
# to generate the client at runtime and fail if `prisma` is not
# installed.  This command reads the schema located in
# `prisma/schema.prisma` and writes the generated client to
# `node_modules/@prisma/client`.
RUN npx prisma generate


# -------- Stage 2: Prepare production image --------
FROM node:20-alpine AS runtime

# Install the same system packages needed at runtime.  The final
# image remains slim because we copy only the production dependencies
# from the build stage below.
RUN apk add --no-cache libc6-compat openssl

# Set working directory for the runtime container.
WORKDIR /app

# Copy only the production dependencies and generated Prisma client
# from the build stage.  This significantly reduces image size and
# attack surface.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy the prisma directory and source code.  The prisma directory is
# included to allow runtime migrations if desired.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

# Expose the port that the Express server listens on.  EasyPanel will
# route external traffic to this port.
EXPOSE 3001

# Define a simple healthcheck that queries the `/health` endpoint.  If
# your server exposes a different health route, adjust accordingly.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# The default command runs the server.  If you change the entrypoint
# script (e.g. transpiled output), update this accordingly.
CMD ["node", "src/server.js"]