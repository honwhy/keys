import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "worker" } })],
  environments: {
    worker: {
      build: {
        sourcemap: true,
      },
    },
  },
  publicDir: "assets",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
    assetsDir: "_app",
  },
});
