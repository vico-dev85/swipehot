import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Rewrite PHP paths to Fastify routes for local dev
      "/api/pool-next.php": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace("/api/pool-next.php", "/api/pool/next"),
      },
      "/api/pool-stats.php": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace("/api/pool-stats.php", "/api/pool/stats"),
      },
      "/api/config.php": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace("/api/config.php", "/api/config"),
      },
      "/api/events.php": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace("/api/events.php", "/api/events"),
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
