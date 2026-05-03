# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 16 frontend. Uses Next's
# `output: 'standalone'` mode (next.config.ts) so the runner stage
# only needs the minimal server bundle + static assets — no full
# node_modules, no `next start`.

# ---- deps ---------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# ---- builder ------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs ./
COPY public ./public
COPY src ./src
# `next build` reads NEXT_PUBLIC_* at build time and bakes them into
# the client bundle. Provide a placeholder so the build doesn't fail
# without it; Railway sets the real value as a Variable on the service
# and it'll be rebaked on the next deploy.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

# ---- runner -------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Standalone bundle: server.js + minimal node_modules.
COPY --from=builder /app/.next/standalone ./
# Static assets (CSS, JS chunks). next/standalone doesn't include these.
COPY --from=builder /app/.next/static ./.next/static
# Public assets (logos, favicon, etc.)
COPY --from=builder /app/public ./public

USER node

# Next.js standalone server reads PORT from env (Railway injects it).
# Bind to 0.0.0.0 so external traffic reaches the container.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
