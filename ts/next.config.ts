import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Emit a standalone server bundle (.next/standalone/server.js) for Docker.
  output: "standalone",
  // Pin the workspace root to this app dir. Required so `next build` emits
  // server.js at the standalone root (not nested under a subdir, which breaks
  // `bun server.js` in Docker). Must equal turbopack.root, and overrides the
  // root Next would otherwise infer from the repo-root bun.lock.
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
    ]
  },
  // The Go backend runs as a sidecar container in the same Cloud Run instance,
  // so the browser reaches it same-origin through this proxy. This replaces the
  // nginx ingress container that used to route /query.
  // Resolved at build time (next build bakes it into routes-manifest.json), so
  // the default has to be the production topology.
  async rewrites() {
    return [
      {
        source: "/query",
        destination: process.env.GRAPHQL_UPSTREAM_URL ?? "http://127.0.0.1:8081/query",
      },
    ]
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
