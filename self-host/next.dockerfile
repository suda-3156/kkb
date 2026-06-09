# Self-host Next.js image (arm64 / Raspberry Pi 5).
# Build context: ./ts  (set in docker-compose: build.context = ../ts).
# bun supports arm64, so the same toolchain works on the Pi.

FROM oven/bun:1.3.10-alpine AS base

# --- deps ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined at build time. For self-host behind nginx the
# browser talks to the API same-origin via "/query" (see nginx/default.conf).
ARG NEXT_PUBLIC_GRAPHQL_URL=/query
ARG NEXT_PUBLIC_TZ=Asia/Tokyo
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}
ENV NEXT_PUBLIC_TZ=${NEXT_PUBLIC_TZ}
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# --- runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# No ./public dir in this project; add a COPY here if one is introduced.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is produced by `next build` with output: "standalone".
CMD ["bun", "server.js"]
