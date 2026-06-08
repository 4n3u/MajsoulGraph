import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared/src"),
      "@client": path.resolve(__dirname, "client/src")
    }
  }
});
