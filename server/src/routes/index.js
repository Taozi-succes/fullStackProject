/**
 * 主路由文件
 * 统一管理所有API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const captchaRoutes = require('./captcha.routes');
const { notFoundHandler } = require('../shared/helpers');
const logger = require('../core/logger');

const router = express.Router();

// API版本信息
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Express API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      captcha: '/api/captcha'
    }
  });
});

// 健康检查端点
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// 注册子路由
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/captcha', captchaRoutes);

// 404处理
router.use('*', notFoundHandler);

module.exports = router;