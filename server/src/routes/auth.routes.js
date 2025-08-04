/**
 * 认证路由
 * 处理用户认证相关的路由
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const UserController = require('../modules/user/controllers/user.controller');
const { authenticateToken } = require('../shared/helpers');
const {
  validateLogin,
  validateRegister,
  validateRefreshToken
} = require('../shared/validators');
const logger = require('../core/logger');
const config = require('../core/config');

const router = express.Router();
const userController = new UserController();

// 登录限流配置
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 开发环境跳过限流
    return config.get('server.nodeEnv') === 'development';
  },
  handler: (req, res) => {
    logger.warn('登录限流触发', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '登录尝试次数过多，请15分钟后再试'
    });
  }
});

// 注册限流配置
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次注册
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '注册尝试次数过多，请1小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return config.get('server.nodeEnv') === 'development';
  },
  handler: (req, res) => {
    logger.warn('注册限流触发', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '注册尝试次数过多，请1小时后再试'
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
 * @route   GET /api/auth/check-username
 * @desc    检查用户名是否可用
 * @access  Public
 */
router.get('/check-username', 
  apiLimiter,
  (req, res) => userController.checkUsername(req, res)
);

/**
 * @route   GET /api/auth/check-email
 * @desc    检查邮箱是否可用
 * @access  Public
 */
router.get('/check-email', 
  apiLimiter,
  (req, res) => userController.checkEmail(req, res)
);

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', 
  registerLimiter,
  (req, res) => userController.register(req, res)
);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', 
  loginLimiter,
  validateLogin,
  (req, res) => userController.login(req, res)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh', 
  apiLimiter,
  validateRefreshToken,
  (req, res) => userController.refreshToken(req, res)
);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', 
  authenticateToken,
  (req, res) => userController.logout(req, res)
);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', 
  authenticateToken,
  (req, res) => userController.getCurrentUser(req, res)
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    验证令牌有效性
 * @access  Private
 */
router.post('/verify-token', 
  authenticateToken,
  (req, res) => {
    // 如果能到达这里，说明令牌有效
    res.json({
      success: true,
      message: '令牌有效',
      data: {
        user: {
          id: req.user.userId,
          username: req.user.username,
          email: req.user.email,
          status: req.user.status
        },
        tokenValid: true
      }
    });
  }
);


/**
 * @route   GET /api/auth/status
 * @desc    获取认证状态
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: '认证服务正常',
    data: {
      authEnabled: true,
      jwtEnabled: true,
      rateLimitEnabled: config.get('server.nodeEnv') !== 'development',
      environment: config.get('server.nodeEnv')
    }
  });
});

module.exports = router;