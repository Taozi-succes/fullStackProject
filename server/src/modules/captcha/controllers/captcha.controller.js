/**
 * 验证码控制器
 * 处理验证码相关的HTTP请求
 */
const CaptchaService = require('../services/captcha.service');
const CaptchaRedisService = require('../services/captcha-redis.service');
const config = require('../../../core/config');
const redisService = require('../../../core/database/redis');
const logger = require('../../../core/logger');
const { HTTP_STATUS, RESPONSE_MESSAGES } = require('../../../common/constants');
const { CaptchaTypeEnum } = require('../../../common/enums');

class CaptchaController {
  constructor() {
    // 根据配置选择验证码服务
    this.useRedis = process.env.CAPTCHA_USE_REDIS === 'true' || false;
    
    if (this.useRedis) {
      this.captchaService = new CaptchaRedisService();
      logger.info('验证码控制器使用Redis存储');
    } else {
      this.captchaService = new CaptchaService();
      logger.info('验证码控制器使用内存存储');
    }
  }

  /**
   * 切换到Redis存储
   */
  async switchToRedis() {
    if (!this.useRedis) {
      this.captchaService = new CaptchaRedisService();
      this.useRedis = true;
      logger.info('验证码服务已切换到Redis存储');
    }
  }

  /**
   * 切换到内存存储
   */
  switchToMemory() {
    if (this.useRedis) {
      this.captchaService = new CaptchaService();
      this.useRedis = false;
      logger.info('验证码服务已切换到内存存储');
    }
  }

  /**
   * 生成验证码
   * GET /api/captcha/generate
   */
  async generateCaptcha(req, res) {
    try {
      const { type = 'default', width, height, length, mathExpr } = req.query;
      
      // 验证验证码类型
      const validTypes = ['default', 'math', 'numeric', ...CaptchaTypeEnum.getAll()];
      if (!validTypes.includes(type)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: '无效的验证码类型',
          code: 'INVALID_CAPTCHA_TYPE'
        });
      }

      const options = {};
      
      // 处理自定义选项
      if (width && !isNaN(width)) {
        options.width = parseInt(width);
      }
      if (height && !isNaN(height)) {
        options.height = parseInt(height);
      }
      if (length && !isNaN(length)) {
        options.size = parseInt(length);
      }

      let result;
      
      // 根据类型生成不同的验证码
      if (type === 'math' || mathExpr === 'true') {
        result = await this.captchaService.generateMathCaptcha(options);
      } else if (type === 'numeric') {
        result = await this.captchaService.generateNumericCaptcha(options);
      } else {
        result = await this.captchaService.generateCaptcha(type, options);
      }

      // 设置响应头
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: RESPONSE_MESSAGES.CAPTCHA_GENERATED,
        data: {
          captchaId: result.id,
          captchaSvg: result.svg,
          expiresAt: result.expiresAt,
          expiresIn: 300 // 5分钟，单位：秒
        }
      });

      logger.info('验证码生成请求处理成功', {
        captchaId: result.id,
        type,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

    } catch (error) {
      console.error('验证码控制器错误详情:', error);
      console.error('错误堆栈:', error.stack);
      logger.error('生成验证码时发生错误:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.INTERNAL_ERROR,
        code: 'CAPTCHA_GENERATION_FAILED'
      });
    }
  }

  /**
   * 验证验证码
   * POST /api/captcha/verify
   */
  async verifyCaptcha(req, res) {
    try {
      const { captchaId, captchaCode } = req.body;

      // 参数验证
      if (!captchaId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: '验证码ID不能为空',
          code: 'CAPTCHA_ID_REQUIRED'
        });
      }

      if (!captchaCode) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: RESPONSE_MESSAGES.CAPTCHA_REQUIRED,
          code: 'CAPTCHA_CODE_REQUIRED'
        });
      }

      // 验证验证码
      const verificationResult = await this.captchaService.verifyCaptcha(captchaId, captchaCode);

      if (verificationResult.success) {
        res.status(HTTP_STATUS.OK).json({
          success: true,
          message: verificationResult.message,
          data: {
            verified: true
          }
        });

        logger.info('验证码验证成功', {
          captchaId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      } else {
        const statusCode = verificationResult.error === 'CAPTCHA_NOT_FOUND' || 
                          verificationResult.error === 'CAPTCHA_EXPIRED' 
                          ? HTTP_STATUS.NOT_FOUND 
                          : HTTP_STATUS.BAD_REQUEST;

        res.status(statusCode).json({
          success: false,
          message: verificationResult.message,
          code: verificationResult.error,
          data: {
            verified: false,
            attemptsLeft: verificationResult.attemptsLeft
          }
        });

        logger.warn('验证码验证失败', {
          captchaId,
          error: verificationResult.error,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

    } catch (error) {
      logger.error('验证验证码时发生错误:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.INTERNAL_ERROR,
        code: 'CAPTCHA_VERIFICATION_FAILED'
      });
    }
  }

  /**
   * 刷新验证码
   * POST /api/captcha/refresh
   */
  async refreshCaptcha(req, res) {
    try {
      const { captchaId, type = 'default' } = req.body;
      const { width, height, length, mathExpr } = req.query;

      const options = {};
      
      // 处理自定义选项
      if (width && !isNaN(width)) {
        options.width = parseInt(width);
      }
      if (height && !isNaN(height)) {
        options.height = parseInt(height);
      }
      if (length && !isNaN(length)) {
        options.size = parseInt(length);
      }

      let result;
      
      // 根据类型生成不同的验证码
      if (type === 'math' || mathExpr === 'true') {
        result = await this.captchaService.generateMathCaptcha(options);
      } else if (type === 'numeric') {
        result = await this.captchaService.generateNumericCaptcha(options);
      } else {
        result = await this.captchaService.refreshCaptcha(captchaId, type, options);
      }

      // 设置响应头
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '验证码刷新成功',
        data: {
          captchaId: result.id,
          captchaSvg: result.svg,
          expiresAt: result.expiresAt,
          expiresIn: 300
        }
      });

      logger.info('验证码刷新请求处理成功', {
        oldCaptchaId: captchaId,
        newCaptchaId: result.id,
        type,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

    } catch (error) {
      logger.error('刷新验证码时发生错误:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.INTERNAL_ERROR,
        code: 'CAPTCHA_REFRESH_FAILED'
      });
    }
  }

  /**
   * 获取验证码统计信息（仅开发环境）
   * GET /api/captcha/stats
   */
  async getCaptchaStats(req, res) {
    try {
      // 仅在开发环境提供统计信息
      if (process.env.NODE_ENV === 'production') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: '生产环境不提供此功能',
          code: 'FEATURE_DISABLED_IN_PRODUCTION'
        });
      }

      const stats = this.captchaService.getStats();
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '获取验证码统计信息成功',
        data: stats
      });

    } catch (error) {
      logger.error('获取验证码统计信息时发生错误:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.INTERNAL_ERROR,
        code: 'STATS_FETCH_FAILED'
      });
    }
  }

  /**
   * 获取SVG验证码图片
   * GET /api/captcha/image/:captchaId
   */
  async getCaptchaImage(req, res) {
    try {
      const { captchaId } = req.params;
      
      if (!captchaId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: '验证码ID不能为空',
          code: 'CAPTCHA_ID_REQUIRED'
        });
      }

      // 这里可以实现从存储中获取SVG图片的逻辑
      // 当前实现中，SVG在生成时就返回给客户端了
      // 这个接口主要用于需要单独获取图片的场景
      
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: '验证码图片不存在或已过期',
        code: 'CAPTCHA_IMAGE_NOT_FOUND'
      });

    } catch (error) {
      logger.error('获取验证码图片时发生错误:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: RESPONSE_MESSAGES.INTERNAL_ERROR,
        code: 'CAPTCHA_IMAGE_FETCH_FAILED'
      });
    }
  }

  /**
   * 清理过期验证码
   * DELETE /api/captcha/cleanup
   */
  async cleanupExpiredCaptchas(req, res) {
    try {
      const result = await this.captchaService.cleanupExpiredCaptchas();
      
      res.json({
        success: true,
        message: '过期验证码清理完成',
        data: {
          cleanedCount: result.cleanedCount
        }
      });
      
    } catch (error) {
      logger.error('清理验证码错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取验证码服务健康状态
   * GET /api/captcha/health
   */
  async getHealthStatus(req, res) {
    try {
      const stats = this.captchaService.getStats();
      
      res.json({
        success: true,
        message: '验证码服务正常',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          stats: {
            totalGenerated: stats.totalGenerated,
            totalVerified: stats.totalVerified,
            successRate: stats.totalGenerated > 0 
              ? ((stats.totalVerified / stats.totalGenerated) * 100).toFixed(2) + '%'
              : '0%',
            activeCaptchas: stats.activeCaptchas
          }
        }
      });
      
    } catch (error) {
      logger.error('验证码健康检查错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: '验证码服务异常'
      });
    }
  }
}

module.exports = CaptchaController;