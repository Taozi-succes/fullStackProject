/**
 * 验证码路由
 * 处理验证码相关的路由
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getCaptchaController } = require('../modules/captcha/controllers');
const { validateCaptcha } = require('../shared/validators');
const config = require('../core/config');
const logger = require('../core/logger');

const router = express.Router();
const captchaController = getCaptchaController();

// 验证码生成限流配置
const captchaGenerateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次生成
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '验证码生成次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return config.get('server.nodeEnv') === 'development';
  },
  handler: (req, res) => {
    logger.warn('验证码生成限流触发', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '验证码生成次数过多，请稍后再试'
    });
  }
});

// 验证码验证限流配置
const captchaVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20, // 最多20次验证
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '验证码验证次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return config.get('server.nodeEnv') === 'development';
  },
  handler: (req, res) => {
    logger.warn('验证码验证限流触发', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '验证码验证次数过多，请稍后再试'
    });
  }
});

// 通用API限流配置
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'API请求次数过多，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return config.get('server.nodeEnv') === 'development';
  }
});

/**
 * @route   GET /api/captcha/generate
 * @desc    生成验证码
 * @access  Public
 * @query   type - 验证码类型 (text|number|math)
 */
router.get('/generate', 
  captchaGenerateLimiter,
  (req, res) => captchaController.generateCaptcha(req, res)
);

/**
 * @route   POST /api/captcha/verify
 * @desc    验证验证码
 * @access  Public
 * @body    { captcha, captchaId }
 */
router.post('/verify', 
  captchaVerifyLimiter,
  validateCaptcha,
  (req, res) => captchaController.verifyCaptcha(req, res)
);

/**
 * @route   POST /api/captcha/refresh
 * @desc    刷新验证码
 * @access  Public
 * @body    { captchaId, type }
 */
router.post('/refresh', 
  captchaGenerateLimiter,
  (req, res) => captchaController.refreshCaptcha(req, res)
);

/**
 * @route   GET /api/captcha/image/:id
 * @desc    获取验证码图片
 * @access  Public
 */
router.get('/image/:id', 
  apiLimiter,
  (req, res) => captchaController.getCaptchaImage(req, res)
);

/**
 * @route   GET /api/captcha/stats
 * @desc    获取验证码统计信息（仅开发环境）
 * @access  Public
 */
router.get('/stats', 
  apiLimiter,
  (req, res, next) => {
    // 只在开发环境提供统计信息
    if (config.get('server.nodeEnv') !== 'development') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: '此功能仅在开发环境可用'
      });
    }
    next();
  },
  (req, res) => captchaController.getCaptchaStats(req, res)
);

/**
 * @route   DELETE /api/captcha/cleanup
 * @desc    清理过期验证码（仅开发环境）
 * @access  Public
 */
router.delete('/cleanup', 
  apiLimiter,
  (req, res, next) => {
    // 只在开发环境提供清理功能
    if (config.get('server.nodeEnv') !== 'development') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: '此功能仅在开发环境可用'
      });
    }
    next();
  },
  (req, res) => captchaController.cleanupExpiredCaptchas(req, res)
);

/**
 * @route   GET /api/captcha/config
 * @desc    获取验证码配置信息
 * @access  Public
 */
router.get('/config', 
  apiLimiter,
  (req, res) => {
    res.json({
      success: true,
      message: '获取验证码配置成功',
      data: {
        config: {
          length: config.get('captcha.length'),
          width: config.get('captcha.width'),
          height: config.get('captcha.height'),
          types: ['text', 'number', 'math'],
          defaultType: 'text',
          expiresIn: 300, // 5分钟
          maxAttempts: 3
        }
      }
    });
  }
);

/**
 * @route   GET /api/captcha/health
 * @desc    验证码服务健康检查
 * @access  Public
 */
router.get('/health', 
  apiLimiter,
  (req, res) => captchaController.getHealthStatus(req, res)
);

module.exports = router;