import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const target = env.API_PROXY_TARGET || "http://localhost:3000";
  const proxy = Object.fromEntries(
    ["/openapi", "/api", "/rpc", "/health", "/ready"].map((path) => [
      path,
      { target },
    ])
  );
  return {
    plugins: [tanstackRouter(), react(), tailwindcss()],
    resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
    server: { port: 3001, strictPort: true, proxy },
    preview: { port: 3001, strictPort: true, proxy },
  };
});
