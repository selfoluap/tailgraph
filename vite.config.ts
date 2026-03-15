import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: resolve(projectDir, "frontend"),
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/config.json": "http://127.0.0.1:8081",
      "/status.json": "http://127.0.0.1:8081",
      "/healthz": "http://127.0.0.1:8081",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [resolve(projectDir, "tests/frontend/**/*.test.ts")],
  },
});
