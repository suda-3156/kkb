# Build context: ./ts  (task build:frontend runs from main/ with --file ./containers/next.dockerfile ./ts)
# Based on https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Adapted for this repo: bun (not pnpm), Next.js standalone output.

FROM oven/bun:1.4.1-alpine@sha256:2ef545220f7a886f22fcb3f2309bbd6bcf1c0aa04b7d79c31765c7aa4a13aac1 AS base

# --- Install dependencies only when needed ---
FROM base AS deps
# libc6-compat: some native deps expect glibc symbols on alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build the source ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_GRAPHQL_URL=/query
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}

# Next.js telemetry off during build.
ENV NEXT_TELEMETRY_DISABLED=1

# Bun v1.13.14 includes a bug which causes a crash while building because of an invalid memory access.
# This bug is already reported and fixed in a canary version.
# Therefore, we use the canary version to build the app until new stable version released.
# https://github.com/oven-sh/bun/issues/36866
# https://github.com/oven-sh/bun/issues/37031
RUN bun upgrade --canary

RUN bun run build

# --- Production runner ---
FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS runner
WORKDIR /app

# libc6-compat: some native deps expect glibc symbols on alpine.
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# No ./public dir in this project; add a COPY here if one is introduced.

# Standalone output already contains a minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# This container is the Cloud Run ingress container (it terminates external
# traffic and proxies /query to the backend sidecar), so it listens on 8080.
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# server.js is produced by `next build` with output: "standalone".
CMD ["node", "server.js"]
