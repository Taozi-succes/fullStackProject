/**
 * Express应用主文件
 * 企业级架构设计，集成所有中间件和路由
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 核心模块
const config = require('./core/config');
const logger = require('./core/logger');
const databaseService = require('./core/database/prisma');

// 路由
const apiRoutes = require('./routes');

// 中间件
const {
  corsOptions,
  requestLogger,
  responseFormatter,
  errorHandler,
  notFoundHandler
} = require('./shared/helpers');

class Application {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * 初始化中间件
   */
  initializeMiddlewares() {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS配置
    this.app.use(cors(corsOptions));

    // 压缩中间件
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024 // 只压缩大于1KB的响应
    }));

    // 请求解析中间件
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // 静态文件服务
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    this.app.use('/uploads', express.static(uploadsDir, {
      maxAge: '1d',
      etag: true,
      lastModified: true
    }));

    // 日志中间件
    if (config.get('server.nodeEnv') === 'production') {
      // 生产环境使用文件日志
      const accessLogStream = fs.createWriteStream(
        path.join(process.cwd(), 'logs', 'access.log'),
        { flags: 'a' }
      );
      this.app.use(morgan('combined', { stream: accessLogStream }));
    } else {
      // 开发环境使用控制台日志
      this.app.use(morgan('dev'));
    }

    // 自定义请求日志
    this.app.use(requestLogger);

    // 响应格式化中间件
    this.app.use(responseFormatter);

    // 信任代理（用于获取真实IP）
    this.app.set('trust proxy', 1);

    // 禁用X-Powered-By头
    this.app.disable('x-powered-by');
  }

  /**
   * 初始化路由
   */
  initializeRoutes() {
    // 健康检查端点（在API路由之前）
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        environment: config.get('server.nodeEnv')
      });
    });
    // API路由
    this.app.use('/api', apiRoutes);
  }

  /**
   * 初始化错误处理
   */
  initializeErrorHandling() {
    // 404处理
    this.app.use('*', notFoundHandler);  

    // 全局错误处理
    this.app.use(errorHandler);
  }

  /**
   * 启动服务器
   */
  async start() {
    try {
      // 初始化数据库连接
      await this.initializeDatabase();

      // 初始化Redis连接
      await this.initializeRedis();

      // 启动HTTP服务器
      const port = config.get('server.port');
      this.server = this.app.listen(port, () => {
        logger.info(`🚀 服务器启动成功`, {
          port,
          environment: config.get('server.nodeEnv'),
          pid: process.pid,
          timestamp: new Date().toISOString()
        });

        logger.info(`📖 API文档: http://localhost:${port}/api`);
        logger.info(`🏥 健康检查: http://localhost:${port}/health`);
      });

      // 设置服务器超时
      this.server.timeout = 30000; // 30秒
      this.server.keepAliveTimeout = 65000; // 65秒
      this.server.headersTimeout = 66000; // 66秒

      // 注册优雅关闭处理
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('服务器启动失败:', error);
      process.exit(1);
    }
  }

  /**
   * 初始化数据库连接
   */
  async initializeDatabase() {
    try {
      await databaseService.connect();
      
      // 检查数据库健康状态
      const isHealthy = await databaseService.healthCheck();
      if (!isHealthy) {
        throw new Error('数据库健康检查失败');
      }

      logger.info('✅ 数据库连接成功');
    } catch (error) {
      logger.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis() {
    try {
      // 检查是否启用Redis
      const useRedis = process.env.CAPTCHA_USE_REDIS === 'true';
      
      if (useRedis) {
        const redisService = require('./core/database/redis');
        await redisService.connect();
        
        // 检查Redis健康状态
        const redisHealth = await redisService.healthCheck();
        if (redisHealth.status !== 'healthy') {
          throw new Error(`Redis健康检查失败: ${redisHealth.message}`);
        }

        logger.info('✅ Redis连接成功');
      } else {
        logger.info('ℹ️ Redis未启用，使用内存存储');
      }
    } catch (error) {
      logger.error('❌ Redis连接失败:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
      // Redis连接失败不应该阻止应用启动，降级到内存存储
      logger.warn('⚠️ 降级到内存存储模式');
      process.env.CAPTCHA_USE_REDIS = 'false';
    }
  }

  /**
   * 设置优雅关闭
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.warn('强制关闭服务器...');
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`收到${signal}信号，开始优雅关闭...`);

      // 设置关闭超时
      const shutdownTimeout = setTimeout(() => {
        logger.error('优雅关闭超时，强制退出');
        process.exit(1);
      }, 30000); // 30秒超时

      try {
        // 停止接受新连接
        if (this.server) {
          await new Promise((resolve) => {
            this.server.close(resolve);
          });
          logger.info('✅ HTTP服务器已关闭');
        }

        // 关闭数据库连接
        await databaseService.disconnect();
        logger.info('✅ 数据库连接已关闭');

        // 关闭Redis连接
        const useRedis = process.env.CAPTCHA_USE_REDIS === 'true';
        if (useRedis) {
          try {
            const redisService = require('./core/database/redis');
            await redisService.disconnect();
            logger.info('✅ Redis连接已关闭');
          } catch (error) {
            logger.warn('Redis关闭时发生错误:', error);
          }
        }

        // 清除超时定时器
        clearTimeout(shutdownTimeout);

        logger.info('✅ 服务器优雅关闭完成');
        process.exit(0);

      } catch (error) {
        logger.error('优雅关闭过程中发生错误:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', {
        reason,
        promise
      });
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * 获取Express应用实例
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取服务器实例
   */
  getServer() {
    return this.server;
  }

  /**
   * 停止服务器
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    await databaseService.disconnect();
  }
}

module.exports = Application;