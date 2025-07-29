/**
 * Prisma数据库客户端配置
 * 企业级单例模式实现，确保全局唯一实例
 */
const { PrismaClient } = require('../../generated/prisma');
const logger = require('../logger');

class DatabaseService {
  constructor() {
    if (DatabaseService.instance) {
      return DatabaseService.instance;
    }

    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // 监听数据库事件
    this.setupEventListeners();
    
    DatabaseService.instance = this;
  }

  /**
   * 设置数据库事件监听器
   */
  setupEventListeners() {
    this.prisma.$on('query', (e) => {
      logger.debug('Query: ' + e.query);
      logger.debug('Params: ' + e.params);
      logger.debug('Duration: ' + e.duration + 'ms');
    });

    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database info:', e.message);
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning:', e.message);
    });
  }

  /**
   * 获取Prisma客户端实例
   */
  getClient() {
    return this.prisma;
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('数据库连接成功');
    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('数据库连接已断开');
    } catch (error) {
      logger.error('断开数据库连接时发生错误:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('数据库健康检查失败:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// 导出单例实例
module.exports = new DatabaseService();