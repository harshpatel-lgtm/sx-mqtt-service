module.exports = {
  apps: [
    {
      name: 'sx-mqtt-ingestor',
      script: './src/ingestor/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
      kill_timeout: 5000, // Give time for buffer flush
    },
  ],
};
