import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:4000",
          changeOrigin: true,
        }
      }
    },
    preview: {
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:4000",
          changeOrigin: true,
        }
      }
    },
    define: {
      "process.env.REACT_APP_NOVU_APPLICATION_IDENTIFIER": JSON.stringify(env.REACT_APP_NOVU_APPLICATION_IDENTIFIER || ""),
      "process.env.NOVU_BACKEND_URL": JSON.stringify(env.NOVU_BACKEND_URL || undefined),
      "process.env.NOVU_SOCKET_URL": JSON.stringify(env.NOVU_SOCKET_URL || undefined)
    }
  };
});
