/**
 * Redis数据库服务
 * 提供Redis连接管理和基础操作
 */
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * 初始化Redis连接
   */
  async connect() {
    try {
      const redisConfig = config.get('redis');
      
      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        connectTimeout: redisConfig.connectTimeout,
        lazyConnect: redisConfig.lazyConnect,
        retryDelayOnFailover: redisConfig.retryDelayOnFailover,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        // 连接池配置
        family: 4,
        keepAlive: true,
        // 重连配置
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      });

      // 监听连接事件
      this.client.on('connect', () => {
        logger.info('Redis连接已建立');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis连接就绪');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis连接错误:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis连接已关闭');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis正在重连...');
      });

      // 如果不是懒连接，立即连接
      if (!redisConfig.lazyConnect) {
        await this.client.connect();
      } else {
        // 懒连接模式下，手动触发连接以确保连接建立
        await this.client.connect();
      }

      logger.info('Redis服务初始化成功', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });

      return this.client;
    } catch (error) {
      logger.error('Redis连接失败:', error);
      throw new Error(`Redis连接失败: ${error.message}`);
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis连接已断开');
    }
  }

  /**
   * 获取Redis客户端实例
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis客户端未初始化，请先调用connect()方法');
    }
    return this.client;
  }

  /**
   * 检查连接状态
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * 设置键值对
   * @param {string} key - 键
   * @param {any} value - 值
   * @param {number} ttl - 过期时间（秒）
   */
  async set(key, value, ttl = null) {
    try {
      const client = this.getClient();
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      
      if (ttl) {
        return await client.setex(key, ttl, serializedValue);
      } else {
        return await client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Redis SET操作失败:', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 获取值
   * @param {string} key - 键
   * @param {boolean} parseJson - 是否解析JSON
   */
  async get(key, parseJson = true) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      
      if (value === null) {
        return null;
      }
      
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Redis GET操作失败:', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 删除键
   * @param {string|string[]} keys - 键或键数组
   */
  async del(keys) {
    try {
      const client = this.getClient();
      return await client.del(keys);
    } catch (error) {
      logger.error('Redis DEL操作失败:', { keys, error: error.message });
      throw error;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key - 键
   */
  async exists(key) {
    try {
      const client = this.getClient();
      return await client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS操作失败:', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 设置过期时间
   * @param {string} key - 键
   * @param {number} ttl - 过期时间（秒）
   */
  async expire(key, ttl) {
    try {
      const client = this.getClient();
      return await client.expire(key, ttl);
    } catch (error) {
      logger.error('Redis EXPIRE操作失败:', { key, ttl, error: error.message });
      throw error;
    }
  }

  /**
   * 获取剩余过期时间
   * @param {string} key - 键
   */
  async ttl(key) {
    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL操作失败:', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 获取匹配模式的所有键
   * @param {string} pattern - 匹配模式
   */
  async keys(pattern) {
    try {
      const client = this.getClient();
      return await client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS操作失败:', { pattern, error: error.message });
      throw error;
    }
  }

  /**
   * 清空当前数据库
   */
  async flushdb() {
    try {
      const client = this.getClient();
      return await client.flushdb();
    } catch (error) {
      logger.error('Redis FLUSHDB操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取Redis信息
   */
  async info() {
    try {
      const client = this.getClient();
      return await client.info();
    } catch (error) {
      logger.error('Redis INFO操作失败:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return {
          status: 'unhealthy',
          message: 'Redis连接未就绪'
        };
      }

      const client = this.getClient();
      const pong = await client.ping();
      
      return {
        status: 'healthy',
        message: 'Redis连接正常',
        response: pong,
        connected: this.isConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis健康检查失败: ${error.message}`,
        error: error.message
      };
    }
  }
}

// 创建单例实例
const redisService = new RedisService();

module.exports = redisService;