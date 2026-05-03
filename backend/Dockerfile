# syntax=docker/dockerfile:1
# Multi-stage build for the Fastify + Prisma backend. Targets Railway
# (or any Docker-compatible PaaS). Debian slim — not Alpine — so
# Prisma's default `linux-x64-openssl-3.0.x` query engine binary works
# without setting `binaryTargets` in schema.prisma.

# ---- deps ---------------------------------------------------------
# Install ALL dependencies (incl. dev) for the build stage.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# ---- builder ------------------------------------------------------
# Generate Prisma client + compile TypeScript.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.check.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

# ---- runner -------------------------------------------------------
# Slim runtime: prod deps only + compiled output + Prisma artefacts.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Re-install only production deps so the image doesn't ship vitest etc.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund --omit=dev && npm cache clean --force
# Prisma client is generated under node_modules/.prisma — copy after
# the prod install so it survives.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
# Migrations + schema are needed at runtime for `prisma migrate deploy`.
COPY --from=builder /app/prisma ./prisma

# Drop privileges. Non-root user is part of the base image already.
USER node

# Railway injects $PORT; the Fastify env loader reads it. EXPOSE is
# documentation — Railway's router doesn't depend on it.
EXPOSE 3001

# `start:prod` runs `prisma migrate deploy` then `node dist/server.js`.
# Idempotent: the migrate step is a no-op when the schema is in sync.
CMD ["npm", "run", "start:prod"]
