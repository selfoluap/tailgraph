const repoRoot = __dirname;

module.exports = {
  apps: [
    {
      name: "tailgraph-backend",
      cwd: repoRoot,
      script: ".venv/bin/python",
      args: "-m uvicorn backend.app:create_app --factory --reload --host 0.0.0.0 --port 8081",
      interpreter: "none",
      autorestart: true,
      restart_delay: 1000,
      env: {
        TS_GRAPH_PORT: "8081",
      },
    },
    {
      name: "tailgraph-frontend",
      cwd: repoRoot,
      script: "npm",
      args: "run dev -- --host 0.0.0.0 --port 8080",
      interpreter: "none",
      autorestart: true,
      restart_delay: 1000,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
