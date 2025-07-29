/**
 * 基于Redis的验证码服务
 * 使用Redis存储验证码，支持分布式部署
 */
const svgCaptcha = require('svg-captcha');
const config = require('../../../core/config');
const logger = require('../../../core/logger');
const redisService = require('../../../core/database/redis');
const { StringUtils } = require('../../../shared/utils');
const { CACHE_KEYS, TIME_CONSTANTS } = require('../../../common/constants');

class CaptchaRedisService {
  constructor() {
    // 验证码默认配置
    this.defaultOptions = {
      width: config.get('captcha.width') || 120,
      height: config.get('captcha.height') || 40,
      fontSize: config.get('captcha.fontSize') || 50,
      noise: config.get('captcha.noise') || 2,
      color: config.get('captcha.color') !== false,
      background: '#f0f0f0'
    };
  }

  /**
   * 生成验证码
   * @param {string} type - 验证码类型 (default, math, numeric)
   * @param {Object} options - 配置选项
   * @returns {Object} 验证码信息
   */
  async generateCaptcha(type = 'default', options = {}) {
    try {
      // 检查Redis连接
      if (!redisService.isReady()) {
        throw new Error('Redis服务未就绪');
      }

      const captchaOptions = {
        ...this.defaultOptions,
        ...options,
        size: options.length || config.get('captcha.length') || 4
      };

      const captchaId = this.generateCaptchaId();
      const expireTime = options.expireTime || 5 * TIME_CONSTANTS.MINUTE / 1000; // 默认5分钟
      const maxAttempts = options.maxAttempts || 3;

      let captcha;

      // 根据类型生成不同的验证码
      switch (type) {
        case 'math':
          console.log('生成数学验证码');
          captcha = svgCaptcha.createMathExpr(captchaOptions);
          break;
        case 'numeric':
          console.log('生成数字验证码');
          captcha = svgCaptcha({
            ...captchaOptions,
            charPreset: '0123456789'
          });
          break;
        default:
          console.log('生成默认验证码');
          captcha = svgCaptcha.create(captchaOptions);
      }

      console.log('验证码生成成功，文本:', captcha.text);

      const expiresAt = new Date(Date.now() + expireTime * 1000);

      // 存储验证码信息到Redis
      const captchaInfo = {
        id: captchaId,
        text: captcha.text.toLowerCase(), // 统一转为小写
        type,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        maxAttempts
      };

      // 使用Redis存储，设置过期时间
      await redisService.set(captchaId, captchaInfo, expireTime);

      console.log('验证码存储到Redis成功');

      logger.info('验证码生成成功', {
        captchaId,
        type,
        length: captcha.text.length,
        storage: 'redis'
      });

      return {
        id: captchaId,
        svg: captcha.data,
        expiresAt,
        expiresIn: expireTime
      };
    } catch (error) {
      console.error('生成验证码时发生详细错误:', error);
      logger.error('验证码生成失败:', error);
      throw new Error(`生成验证码失败: ${error.message}`);
    }
  }

  /**
   * 验证验证码
   * @param {string} captchaId - 验证码ID
   * @param {string} userInput - 用户输入
   * @returns {Object} 验证结果
   */
  async verifyCaptcha(captchaId, userInput) {
    try {
      console.log('验证验证码 - captchaId:', captchaId);
      console.log('验证验证码 - userInput:', userInput);

      // 开发环境测试验证码支持
      if (process.env.NODE_ENV === 'development' && 
          captchaId === process.env.DEV_TEST_CAPTCHA_ID && 
          userInput === process.env.DEV_TEST_CAPTCHA_CODE) {
        logger.info('使用开发环境测试验证码验证成功（Redis）', { captchaId, userInput });
        return {
          success: true,
          message: '验证码验证成功（测试模式）'
        };
      }

      // 检查Redis连接
      if (!redisService.isReady()) {
        throw new Error('Redis服务未就绪');
      }

      // 从Redis获取验证码信息
      const captchaInfo = await redisService.get(captchaId);
      console.log('从Redis获取的验证码信息:', captchaInfo);

      if (!captchaInfo) {
        console.log('验证码未找到 - captchaId:', captchaId);
        return {
          success: false,
          error: 'CAPTCHA_NOT_FOUND',
          message: '验证码不存在或已过期'
        };
      }

      // 检查是否过期
      const now = new Date();
      const expiresAt = new Date(captchaInfo.expiresAt);
      if (now > expiresAt) {
        await redisService.del(captchaId);
        return {
          success: false,
          error: 'CAPTCHA_EXPIRED',
          message: '验证码已过期'
        };
      }

      // 检查尝试次数
      if (captchaInfo.attempts >= captchaInfo.maxAttempts) {
        await redisService.del(captchaId);
        return {
          success: false,
          error: 'CAPTCHA_MAX_ATTEMPTS',
          message: '验证码尝试次数过多'
        };
      }

      // 增加尝试次数
      captchaInfo.attempts++;

      // 验证验证码
      const isValid = userInput.toLowerCase() === captchaInfo.text;

      if (isValid) {
        // 验证成功，删除验证码
        await redisService.del(captchaId);

        logger.info('验证码验证成功', {
          captchaId,
          type: captchaInfo.type,
          attempts: captchaInfo.attempts,
          storage: 'redis'
        });

        return {
          success: true,
          message: '验证码验证成功'
        };
      } else {
        // 更新尝试次数到Redis
        const ttl = await redisService.ttl(captchaId);
        if (ttl > 0) {
          await redisService.set(captchaId, captchaInfo, ttl);
        }

        logger.warn('验证码验证失败', {
          captchaId,
          type: captchaInfo.type,
          attempts: captchaInfo.attempts,
          userInput: userInput.toLowerCase(),
          expected: captchaInfo.text,
          storage: 'redis'
        });

        return {
          success: false,
          error: 'CAPTCHA_INVALID',
          message: '验证码错误',
          attemptsLeft: captchaInfo.maxAttempts - captchaInfo.attempts
        };
      }
    } catch (error) {
      logger.error('验证码验证过程中发生错误:', error);
      throw new Error('验证码验证失败');
    }
  }

  /**
   * 生成数字验证码
   * @param {Object} options - 配置选项
   * @returns {Object} 验证码信息
   */
  async generateNumericCaptcha(options = {}) {
    const numericOptions = {
      ...options,
      size: options.size || 4,
      ignoreChars: '0o1il', // 排除容易混淆的字符
      noise: options.noise || 1,
      color: options.color !== false
    };

    return this.generateCaptcha('numeric', numericOptions);
  }

  /**
   * 生成数学运算验证码
   * @param {Object} options - 配置选项
   * @returns {Object} 验证码信息
   */
  async generateMathCaptcha(options = {}) {
    try {
      const mathOptions = {
        width: config.get('captcha.width'),
        height: config.get('captcha.height'),
        fontSize: config.get('captcha.fontSize') || 50,
        noise: config.get('captcha.noise') || 1,
        color: config.get('captcha.color'),
        background: options.background || '#f0f0f0',
        ...options
      };

      return this.generateCaptcha('math', mathOptions);
    } catch (error) {
      logger.error('数学验证码生成失败:', error);
      throw new Error('数学验证码生成失败');
    }
  }

  /**
   * 刷新验证码
   * @param {string} captchaId - 原验证码ID
   * @param {string} type - 验证码类型
   * @param {Object} options - 配置选项
   * @returns {Object} 新验证码信息
   */
  async refreshCaptcha(captchaId, type = 'default', options = {}) {
    // 删除旧验证码
    if (captchaId && redisService.isReady()) {
      await redisService.del(captchaId);
    }

    // 生成新验证码
    return this.generateCaptcha(type, options);
  }

  /**
   * 生成验证码ID
   * @returns {string} 验证码ID
   */
  generateCaptchaId() {
    return `${CACHE_KEYS.CAPTCHA}${Date.now()}_${StringUtils.generateRandom(8)}`;
  }

  /**
   * 清理过期验证码（Redis会自动处理过期，这里主要用于统计）
   */
  async cleanup() {
    try {
      if (!redisService.isReady()) {
        return { cleanedCount: 0, message: 'Redis服务未就绪' };
      }

      // 获取所有验证码键
      const pattern = `${CACHE_KEYS.CAPTCHA}*`;
      const keys = await redisService.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await redisService.ttl(key);
        if (ttl === -2) { // 键不存在
          cleanedCount++;
        }
      }

      logger.debug(`Redis验证码清理检查完成，发现 ${cleanedCount} 个已过期的键`);

      return {
        cleanedCount,
        totalKeys: keys.length,
        message: 'Redis自动处理过期键'
      };
    } catch (error) {
      logger.error('验证码清理检查失败:', error);
      return { cleanedCount: 0, error: error.message };
    }
  }

  /**
   * 获取验证码统计信息
   */
  async getStats() {
    try {
      if (!redisService.isReady()) {
        return {
          total: 0,
          message: 'Redis服务未就绪'
        };
      }

      const pattern = `${CACHE_KEYS.CAPTCHA}*`;
      const keys = await redisService.keys(pattern);

      const stats = {
        total: keys.length,
        storage: 'redis',
        redisStatus: 'connected'
      };

      // 按类型统计
      const typeStats = {};
      for (const key of keys.slice(0, 100)) { // 限制检查数量避免性能问题
        try {
          const info = await redisService.get(key);
          if (info && info.type) {
            typeStats[info.type] = (typeStats[info.type] || 0) + 1;
          }
        } catch (error) {
          // 忽略单个键的错误
        }
      }

      stats.byType = typeStats;

      return stats;
    } catch (error) {
      logger.error('获取验证码统计信息失败:', error);
      return {
        total: 0,
        error: error.message,
        storage: 'redis',
        redisStatus: 'error'
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const redisHealth = await redisService.healthCheck();
      
      if (redisHealth.status !== 'healthy') {
        return {
          status: 'unhealthy',
          message: '验证码服务依赖的Redis不可用',
          redis: redisHealth
        };
      }

      // 测试基本操作
      const testKey = `${CACHE_KEYS.CAPTCHA}health_check_${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };
      
      await redisService.set(testKey, testValue, 10); // 10秒过期
      const retrieved = await redisService.get(testKey);
      await redisService.del(testKey);

      if (retrieved && retrieved.test === true) {
        return {
          status: 'healthy',
          message: '验证码服务正常',
          storage: 'redis',
          redis: redisHealth
        };
      } else {
        return {
          status: 'unhealthy',
          message: '验证码服务Redis操作异常',
          redis: redisHealth
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `验证码服务健康检查失败: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = CaptchaRedisService;