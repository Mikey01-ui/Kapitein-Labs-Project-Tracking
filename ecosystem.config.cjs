module.exports = {
  apps: [
    {
      name: "kapitein-api",
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
      name: "kapitein-web",
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
  ],
};
