module.exports = {
  apps: [{
    name: 'express-pm2-dev',
    script: 'server.js',
    instances: 1,                    // 开发环境保持单实例（便于调试）
    exec_mode: 'fork',
    watch: true,
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'prisma/migrations',
      '.git',
      '*.log'
    ],
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_development_cluster: {       // 开发集群环境变量
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};