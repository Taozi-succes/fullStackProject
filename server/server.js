/**
 * 服务器启动文件
 * 企业级Express应用入口点
 */
require('dotenv').config();

const Application = require('./src/app');
const logger = require('./src/core/logger');
const config = require('./src/core/config');

/**
 * 启动应用程序
 */
async function bootstrap() {
  try {
    // 显示启动信息
    logger.info('🚀 正在启动Express应用...');
    console.log('Config object:', config);
    console.log('Config server:', config.server);
    logger.info(`📦 环境: ${config.server?.nodeEnv || 'unknown'}`);
    logger.info(`🔧 Node.js版本: ${process.version}`);
    logger.info(`💾 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    // 创建应用实例
    const app = new Application();
    
    // 启动服务器
    await app.start();
    
    logger.info('✅ 应用启动完成');
    
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    logger.error('❌ 应用启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
bootstrap();

// 导出应用实例（用于测试）
module.exports = bootstrap;