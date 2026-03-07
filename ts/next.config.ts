import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
