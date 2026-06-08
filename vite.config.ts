import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: "client",
  plugins: [react()],
  publicDir: "../public",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared/src"),
      "@client": path.resolve(__dirname, "client/src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:10000"
    }
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true
  }
});
