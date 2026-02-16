module.exports = {
  apps: [
    {
      name: 'xcamvip-api',
      script: 'packages/api/dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      node_args: '--enable-source-maps',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/xcamvip/api-error.log',
      out_file: '/var/log/xcamvip/api-out.log',
      merge_logs: true,
      // Restart policy
      max_restarts: 10,
      restart_delay: 1000,
      autorestart: true,
      watch: false,
    },
  ],
};
