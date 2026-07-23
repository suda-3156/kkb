import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Fix the timezone so date/week/month boundary tests are deterministic
    // regardless of the machine running them. NEXT_PUBLIC_TZ drives the app's
    // Intl formatting; TZ aligns Node's local Date construction with it.
    env: {
      TZ: "Asia/Tokyo",
      NEXT_PUBLIC_TZ: "Asia/Tokyo",
    },
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
