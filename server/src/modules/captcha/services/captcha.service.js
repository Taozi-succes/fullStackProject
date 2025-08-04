/**
 * 验证码服务
 * 使用svg-captcha生成图片验证码
 */
const svgCaptcha = require('svg-captcha');
const config = require('../../../core/config');
const logger = require('../../../core/logger');
const { StringUtils } = require('../../../shared/utils');
const { CACHE_KEYS, TIME_CONSTANTS } = require('../../../common/constants');

class CaptchaService {
  constructor() {
    // 防止外部直接实例化
    if (CaptchaService.instance) {
      return CaptchaService.instance;
    }

    this.captchaStore = new Map(); // 简单内存存储，生产环境建议使用Redis
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * TIME_CONSTANTS.MINUTE); // 每5分钟清理一次过期验证码

    // 设置单例实例
    CaptchaService.instance = this;
  }

  /**
   * 获取单例实例
   * @returns {CaptchaService} 验证码服务实例
   */
  static getInstance() {
    if (!CaptchaService.instance) {
      CaptchaService.instance = new CaptchaService();
    }
    return CaptchaService.instance;
  }

  /**
   * 生成验证码
   * @param {string} type - 验证码类型
   * @param {Object} options - 配置选项
   * @returns {Object} 验证码信息
   */
  async generateCaptcha(type = 'default', options = {}) {
    try {
      console.log('开始生成验证码，类型:', type, '选项:', options);
      
      // 生成唯一标识
      const captchaId = this.generateCaptchaId();
      console.log('生成的验证码ID:', captchaId);
      
      // 获取配置
      const captchaLength = config.get('captcha.length') || 4;
      const captchaWidth = config.get('captcha.width') || 150;
      const captchaHeight = config.get('captcha.height') || 50;
      const expireTime = config.get('captcha.expireTime') || 300;
      const maxAttempts = config.get('captcha.maxAttempts') || 3;
      
      console.log('验证码配置:', { captchaLength, captchaWidth, captchaHeight, expireTime, maxAttempts });
      
      const captchaOptions = {
        size: options.size || captchaLength,
        width: options.width || captchaWidth,
        height: options.height || captchaHeight,
        fontSize: config.get('captcha.fontSize') || 50,
        noise: config.get('captcha.noise') || 2,
        color: config.get('captcha.color'),
        background: options.background || '#f0f0f0',
        ignoreChars: '0o1il',
        ...options
      };
      
      console.log('最终验证码选项:', captchaOptions);

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
      
      // 存储验证码信息
      const captchaInfo = {
        id: captchaId,
        text: captcha.text.toLowerCase(), // 统一转为小写
        type,
        createdAt: new Date(),
        expiresAt,
        attempts: 0,
        maxAttempts
      };
      
      this.captchaStore.set(captchaId, captchaInfo);
      
      console.log('验证码存储成功');

      const currentCaptchaInfo=this.captchaStore.get(captchaId);
      console.log('当前储存验证码信息:   可以打印', currentCaptchaInfo);
      console.log('当前map信息', this.captchaStore);
      
      logger.info('验证码生成成功', {
        captchaId,
        type,
        length: captcha.text.length
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
    console.log('开始验证验证码，ID:', captchaId, '用户输入:', userInput);
    console.log('当前服务实例:', this.constructor.name);
    console.log('当前Map大小:', this.captchaStore.size);
    console.log('Map中的所有键:', Array.from(this.captchaStore.keys()));
    
    try {
      // 开发环境测试验证码支持
      if (process.env.NODE_ENV === 'development' && 
          captchaId === process.env.DEV_TEST_CAPTCHA_ID && 
          userInput === process.env.DEV_TEST_CAPTCHA_CODE) {
        logger.info('使用开发环境测试验证码验证成功', { captchaId, userInput });
        return {
          success: true,
          message: '验证码验证成功（测试模式）'
        };
      }
      
      const captchaInfo = this.captchaStore.get(captchaId);
      console.log('验证码信息==========:', captchaInfo);
      
      if (!captchaInfo) {
        return {
          success: false,
          error: 'CAPTCHA_NOT_FOUND',
          message: '验证码不存在或已过期'
        };
      }
      
      // 检查是否过期
      if (new Date() > captchaInfo.expiresAt) {
        this.captchaStore.delete(captchaId);
        return {
          success: false,
          error: 'CAPTCHA_EXPIRED',
          message: '验证码已过期'
        };
      }
      
      // 检查尝试次数
      if (captchaInfo.attempts >= captchaInfo.maxAttempts) {
        this.captchaStore.delete(captchaId);
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
        this.captchaStore.delete(captchaId);
        
        logger.info('验证码验证成功', {
          captchaId,
          type: captchaInfo.type,
          attempts: captchaInfo.attempts
        });
        
        return {
          success: true,
          message: '验证码验证成功'
        };
      } else {
        logger.warn('验证码验证失败', {
          captchaId,
          type: captchaInfo.type,
          attempts: captchaInfo.attempts,
          userInput: userInput.toLowerCase(),
          expected: captchaInfo.text
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
    if (captchaId) {
      this.captchaStore.delete(captchaId);
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
   * 清理过期验证码
   */
  cleanup() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, info] of this.captchaStore.entries()) {
      if (now > info.expiresAt) {
        this.captchaStore.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`清理了 ${cleanedCount} 个过期验证码`);
    }
  }

  /**
   * 清理过期验证码（对外接口）
   * @returns {Object} 清理结果
   */
  async cleanupExpiredCaptchas() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, info] of this.captchaStore.entries()) {
      if (now > info.expiresAt) {
        this.captchaStore.delete(id);
        cleanedCount++;
      }
    }
    
    logger.info(`手动清理了 ${cleanedCount} 个过期验证码`);
    
    return {
      cleanedCount
    };
  }

  /**
   * 获取验证码统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const info of this.captchaStore.values()) {
      if (now > info.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }
    
    return {
      total: this.captchaStore.size,
      active: activeCount,
      expired: expiredCount,
      totalGenerated: this.captchaStore.size,
      totalVerified: activeCount,
      activeCaptchas: activeCount,
      // 查看当前所有的验证码键值对
      captchaStore: Array.from(this.captchaStore)
    };
  }

  /**
   * 销毁服务实例
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.captchaStore.clear();
  }

  /**
   * 销毁单例实例（主要用于测试或应用关闭）
   */
  static destroyInstance() {
    if (CaptchaService.instance) {
      CaptchaService.instance.destroy();
      CaptchaService.instance = null;
    }
  }
}

// 静态属性
CaptchaService.instance = null;

module.exports = CaptchaService;