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
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
