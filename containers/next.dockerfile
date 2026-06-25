# Build context: ./ts  (task build:frontend runs from main/ with --file ./containers/next.dockerfile ./ts)
# Based on https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Adapted for this repo: bun (not pnpm), Next.js standalone output.

FROM oven/bun:1.3.10-alpine AS base

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
RUN bun run build

# --- Production runner ---
FROM node:22-alpine AS runner
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

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is produced by `next build` with output: "standalone".
CMD ["node", "server.js"]
