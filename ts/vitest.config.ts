import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = { "@": path.resolve(__dirname, ".") }

// Fix the timezone so date/week/month boundary tests are deterministic
// regardless of the machine running them. NEXT_PUBLIC_TZ drives the app's
// Intl formatting; TZ aligns Node's local Date construction with it.
const env = {
  TZ: "Asia/Tokyo",
  NEXT_PUBLIC_TZ: "Asia/Tokyo",
}

export default defineConfig({
  test: {
    // Two environments. The pure-logic tests under lib/ have no DOM and should
    // not pay for one; the component tests need jsdom and a setup file.
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          env,
          environment: "node",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "dom",
          env,
          environment: "jsdom",
          include: ["{app,components,hooks}/**/*.test.tsx"],
          setupFiles: ["./test/setup.ts"],
        },
      },
    ],
  },
})
