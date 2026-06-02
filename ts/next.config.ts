import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Emit a standalone server bundle (.next/standalone/server.js) for Docker.
  output: "standalone",
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
    root: path.join(__dirname, ".."),
  },
}

export default nextConfig
