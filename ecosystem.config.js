module.exports = {
  apps: [
    {
      name: 'sx-mqtt-ingestor',
      script: './src/ingestor/index.js',
      instances: 1,
      exec_mode: 'fork',
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
