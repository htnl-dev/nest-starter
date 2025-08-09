module.exports = {
  apps: [
    {
      name: 'nest-starter',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/usr/src/app/logs/err.log',
      out_file: '/usr/src/app/logs/out.log',
      log_file: '/usr/src/app/logs/combined.log',
      time: true,
    },
  ],
};