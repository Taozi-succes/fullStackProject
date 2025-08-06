/**
 * 用户路由
 * 处理用户相关的路由
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const UserController = require('../modules/user/controllers/user.controller');
const { authenticateToken ,requireRole} = require('../shared/helpers');
const {
  validateUpdateUser,
  validateChangePassword,
  validateId
} = require('../shared/validators');
const { fileUploadHelper } = require('../shared/helpers');
const config = require('../core/config');
const logger = require('../core/logger');

const router = express.Router();
const userController = new UserController();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = fileUploadHelper.generateUniqueFileName(file.originalname);
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (fileUploadHelper.isAllowedFileType(file.mimetype, allowedTypes)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WebP)'), false);
  }
};

// 头像上传中间件
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// API限流配置
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
    return process.env.NODE_ENV === 'development';
  }
});

// 敏感操作限流配置
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 最多10次敏感操作
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '敏感操作次数过多，请1小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

/**
 * @route   GET /api/user/profile
 * @desc    获取用户详细信息
 * @access  Private
 */
router.get('/profile', 
  authenticateToken,
  apiLimiter,
  userController.getProfile
);

/**
 * @route   PUT /api/user/profile
 * @desc    更新用户信息
 * @access  Private
 */
router.put('/profile', 
  authenticateToken,
  apiLimiter,
  validateUpdateUser,
  userController.updateProfile
);

/**
 * @route   PUT /api/user/password
 * @desc    修改密码
 * @access  Private
 */
router.put('/password', 
  authenticateToken,
  sensitiveOpLimiter,
  validateChangePassword,
  userController.changePassword
);

/**
 * @route   POST /api/user/avatar
 * @desc    上传头像
 * @access  Private
 */
router.post('/avatar', 
  authenticateToken,
  apiLimiter,
  (req, res, next) => {
    uploadAvatar.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: '文件大小不能超过5MB'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            code: 'TOO_MANY_FILES',
            message: '只能上传一个文件'
          });
        }
      } else if (err) {
        return res.status(400).json({
          success: false,
          code: 'UPLOAD_ERROR',
          message: err.message
        });
      }
      next();
    });
  },
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/user/avatar
 * @desc    删除头像
 * @access  Private
 */
router.delete('/avatar', 
  authenticateToken,
  apiLimiter,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // 更新用户头像为空
      const result = await userController.userService.updateUser(userId, { avatar: null });
      
      if (!result.success) {
        const statusCode = userController.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.json({
        success: true,
        message: '头像删除成功'
      });
      
    } catch (error) {
      logger.error('删除头像错误:', error);
      res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * @route   GET /api/user/settings
 * @desc    获取用户设置
 * @access  Private
 */
router.get('/settings', 
  authenticateToken,
  apiLimiter,
  (req, res) => {
    // 这里可以扩展用户设置功能
    res.json({
      success: true,
      message: '获取用户设置成功',
      data: {
        settings: {
          theme: 'light',
          language: 'zh-CN',
          notifications: {
            email: true,
            push: false,
            sms: false
          },
          privacy: {
            profileVisible: true,
            emailVisible: false
          }
        }
      }
    });
  }
);

/**
 * @route   PUT /api/user/settings
 * @desc    更新用户设置
 * @access  Private
 */
router.put('/settings', 
  authenticateToken,
  apiLimiter,
  (req, res) => {
    // 这里可以扩展用户设置更新功能
    const { settings } = req.body;
    
    logger.info('用户设置更新', {
      userId: req.user.userId,
      settings
    });
    
    res.json({
      success: true,
      message: '用户设置更新成功',
      data: {
        settings
      }
    });
  }
);

/**
 * @route   GET /api/user/activity
 * @desc    获取用户活动记录
 * @access  Private
 */
router.get('/activity', 
  authenticateToken,
  apiLimiter,
  (req, res) => {
    // 这里可以扩展用户活动记录功能
    const activities = [
      {
        id: 1,
        type: 'login',
        description: '用户登录',
        timestamp: new Date().toISOString(),
        ip: req.ip
      },
      {
        id: 2,
        type: 'profile_update',
        description: '更新个人信息',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        ip: req.ip
      }
    ];
    
    res.json({
      success: true,
      message: '获取活动记录成功',
      data: {
        activities
      }
    });
  }
);

/**
 * @route   POST /api/user/deactivate
 * @desc    停用账户
 * @access  Private
 */
router.post('/deactivate', 
  authenticateToken,
  sensitiveOpLimiter,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { reason } = req.body;
      
      // 这里可以实现账户停用逻辑
      logger.warn('用户请求停用账户', {
        userId,
        reason,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: '账户停用请求已提交，将在24小时内处理'
      });
      
    } catch (error) {
      logger.error('停用账户错误:', error);
      res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * @route   GET /api/user/export
 * @desc    导出用户数据
 * @access  Private
 */
router.get('/export', 
  authenticateToken,
  sensitiveOpLimiter,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // 这里可以实现用户数据导出功能
      const userData = {
        user: {
          id: req.user.userId,
          username: req.user.username,
          email: req.user.email,
          status: req.user.status
        },
        exportTime: new Date().toISOString(),
        dataTypes: ['profile', 'settings', 'activity']
      };
      
      logger.info('用户数据导出', { userId });
      
      res.json({
        success: true,
        message: '用户数据导出成功',
        data: userData
      });
      
    } catch (error) {
      logger.error('导出用户数据错误:', error);
      res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      });
    }
  }
);

/**
 * @route   GET /api/user/list
 * @desc    获取所有用户列表（仅管理员可用）
 * @access  Private (Admin only)
 */
router.get('/list', 
  authenticateToken,
  requireRole('admin'),
  apiLimiter,
  userController.getAllUsers
);

/**
 * @route   PUT /api/user/:id/roles
 * @desc    更新用户角色（仅管理员可用）
 * @access  Private (Admin only)
 */
router.put('/:id/roles', 
  authenticateToken,
  sensitiveOpLimiter,
  validateId,
  (req, res) => userController.updateUserRoles(req, res)
);

/**
 * @route   DELETE /api/user/:id
 * @desc    删除指定用户（仅管理员可用）
 * @access  Private (Admin only)
 */
router.delete('/:id', 
  authenticateToken,
  sensitiveOpLimiter,
  validateId,
  userController.deleteUser
);

/**
 * @route   GET /api/user/avatar/history
 * @desc    获取头像历史记录
 * @access  Private
 */
router.get('/avatar/history', 
  authenticateToken,
  apiLimiter,
  userController.getAvatarHistory
);

/**
 * @route   PUT /api/user/avatar/switch/:historyId
 * @desc    切换到历史头像
 * @access  Private
 */
router.put('/avatar/switch/:historyId', 
  authenticateToken,
  apiLimiter,
  userController.switchToHistoryAvatar
);

module.exports = router;