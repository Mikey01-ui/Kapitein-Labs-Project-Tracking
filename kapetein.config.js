module.exports = {
  apps: [
    {
      name: "kapetein-api",
      cwd: "./server",
      script: "dist/server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
    {
      name: "kapetein-web",
      cwd: "./client",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --port 5173 --host",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "kapetein-tunnel",
      script: "/usr/local/bin/cloudflared",
      args: "tunnel --url http://localhost:4000",
      autorestart: true,
      watch: false,
      log_file: "/home/choso/Choso-Track/kapetein-tunnel.log",
      error_file: "/home/choso/Choso-Track/kapetein-tunnel.err",
    },
  ],
};
