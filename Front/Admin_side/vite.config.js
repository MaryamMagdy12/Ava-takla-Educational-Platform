import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  /** Always resolve env from this app folder (not `process.cwd()` when npm is run from a parent directory). */
  const env = loadEnv(mode, __dirname, "");
  const target = (env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000").replace(/\/$/, "");

  return {
    root: __dirname,
    envDir: __dirname,
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST === "true",
      /** Optional: same-origin `/api` proxy. The SPA uses `http(s)://<host>:8000/api` in dev by default so large uploads hit PHP directly. */
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          timeout: 3 * 60 * 60 * 1000,
          proxyTimeout: 3 * 60 * 60 * 1000,
          configure(proxy) {
            proxy.on("error", (err, _req, res) => {
              console.error("[vite proxy /api → " + target + "]", err.message);
              if (res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Bad gateway (is Laravel running on " + target + "?)" }));
              }
            });
          },
        },
        "/storage": {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
