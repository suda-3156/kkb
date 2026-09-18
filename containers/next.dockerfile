# Build context: ./ts  (task build:frontend runs from main/ with --file ./containers/next.dockerfile ./ts)
# Based on https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Adapted for this repo: bun (not pnpm), Next.js standalone output.

FROM oven/bun:1.4.2-alpine@sha256:d888c0ae6c86d7866ff10c5aafdd9077b36aee6455b33dd270fb93c0dd5cef6f AS base

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
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS runner
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
