/**
 * 用户控制器
 * 处理用户相关的HTTP请求
 */
const UserService = require('../services/user.service');
const { LoginDto, RegisterDto, UpdateUserDto,AdminUpdateUserDto, ChangePasswordDto } = require('../dto/user.dto');
const logger = require('../../../core/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../../../common/constants');
const { JwtUtils } = require('../../../shared/utils');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * 用户登录
   * POST /api/auth/login
   */
  login = async (req, res) => {
    try {
      // 数据验证
      const loginDto = new LoginDto(req.body);
      
      // 调用服务层处理登录
      const result = await this.userService.login(loginDto.getData());
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      // 登录成功
      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('登录控制器错误:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 用户注册
   * POST /api/auth/register
   */
  register = async (req, res) => {
    try {
      // 数据验证
      const registerDto = new RegisterDto(req.body);
      const validationResult = registerDto.validate();
      
      if (!validationResult.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '请求参数验证失败',
          errors: validationResult.errors
        });
      }

      // 调用服务层处理注册
      const result = await this.userService.register(registerDto.getData());
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      // 注册成功
      res.status(HTTP_STATUS.CREATED).json(result);
      
    } catch (error) {
      logger.error('注册控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 获取用户信息
   * GET /api/user/profile
   */
  getProfile = async (req, res) => {
    try {
      const userId = req.user.userId; // 从JWT中间件获取
      
      const result = await this.userService.getUserInfo(userId);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('获取用户信息控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 更新用户信息
   * PUT /api/user/profile
   */
  updateProfile = async (req, res) => {
    try {
      const userId = req.user.userId; // 从JWT中间件获取
      
      // 数据验证
      const updateDto = new UpdateUserDto(req.body);
      const validationResult = updateDto.validate();
      
      if (!validationResult.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '请求参数验证失败',
          errors: validationResult.errors
        });
      }

      // 调用服务层处理更新
      const result = await this.userService.updateUser(userId, updateDto.getUpdateFields());
      
      if (!result.success) {
        return res.error(result.message, result.code)
      }

      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('更新用户信息控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 管理员更新用户信息（仅管理员可用）
   * PUT /api/admin/user/:id
   */
  adminUpdateUser = async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;
      
      // 检查当前用户是否为管理员
      logger.info('开始检查管理员权限', { currentUserId, targetUserId: id });
      const currentUser = await this.userService.findUserById(currentUserId);
      
      if (!currentUser) {
        logger.warn('当前用户不存在', { currentUserId });
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: '用户不存在'
        });
      }
      
      // 解析用户角色（从JSON字符串转换为数组）
      let userRoles = [];
      try {
        userRoles = typeof currentUser.roles === 'string' ? JSON.parse(currentUser.roles) : currentUser.roles;
        logger.info('解析后的用户角色', { userRoles });
      } catch (error) {
        logger.error('解析用户角色失败:', { error: error.message, roles: currentUser.roles });
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          code: ERROR_CODES.INTERNAL_ERROR,
          message: '用户角色数据异常'
        });
      }
      
      if (!Array.isArray(userRoles) || !userRoles.includes('admin')) {
        logger.warn('权限不足', { userRoles, hasAdmin: userRoles.includes('admin') });
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: '权限不足，仅管理员可以修改用户信息'
        });
      }
      
      // 防止管理员修改自己的角色和状态
      if (parseInt(id) === currentUserId && (req.body.roles || req.body.status)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '不能修改自己的角色和状态'
        });
      }
      
      // 数据验证
      const adminUpdateDto = new AdminUpdateUserDto(req.body);
      const validationResult = adminUpdateDto.validate();
      
      if (!validationResult.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '请求参数验证失败',
          errors: validationResult.errors
        });
      }
      
      // 获取有效的更新字段
      const updateFields = adminUpdateDto.getUpdateFields();
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '没有提供要更新的字段'
        });
      }
      
      // 调用服务层更新用户
      const result = await this.userService.adminUpdateUser(parseInt(id), updateFields);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }
      
      // 记录管理员操作
      logger.warn('管理员更新用户信息', {
        adminId: currentUserId,
        targetUserId: id,
        updatedFields: Object.keys(updateFields),
        ip: req.ip
      });
      
      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('管理员更新用户控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 检查用户名是否可用
   * GET /api/auth/check-username
   */
  checkUsername = async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '用户名不能为空'
        });
      }

      const existingUser = await this.userService.findUserByUsername(username);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '检查完成',
        data: {
          available: !existingUser
        }
      });
      
    } catch (error) {
      logger.error('检查用户名可用性错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 更新用户角色（仅管理员可用）
   * PUT /api/user/:id/roles
   */
  updateUserRoles = async (req, res) => {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      const currentUserId = req.user.userId;
      
      // 检查当前用户是否为管理员
      logger.info('开始检查用户权限', { currentUserId, targetUserId: id });
      const currentUser = await this.userService.findUserById(currentUserId);
      
      if (!currentUser) {
        logger.warn('当前用户不存在', { currentUserId });
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: '用户不存在'
        });
      }
      
      logger.info('当前用户信息', { userId: currentUser.id, roles: currentUser.roles });
      
      // 解析用户角色（从JSON字符串转换为数组）
      let userRoles = [];
      try {
        userRoles = typeof currentUser.roles === 'string' ? JSON.parse(currentUser.roles) : currentUser.roles;
        logger.info('解析后的用户角色', { userRoles });
      } catch (error) {
        logger.error('解析用户角色失败:', { error: error.message, roles: currentUser.roles });
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          code: ERROR_CODES.INTERNAL_ERROR,
          message: '用户角色数据异常'
        });
      }
      
      if (!Array.isArray(userRoles) || !userRoles.includes('admin')) {
        logger.warn('权限不足', { userRoles, hasAdmin: userRoles.includes('admin') });
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: '权限不足，仅管理员可以修改用户角色'
        });
      }
      
      // 验证角色数组
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '角色必须是非空数组'
        });
      }
      
      // 验证角色值
      const validRoles = ['user', 'admin', 'moderator'];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `无效的角色: ${invalidRoles.join(', ')}`
        });
      }
      
      // 更新用户角色
      const result = await this.userService.updateUserRoles(parseInt(id), roles);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }
      
      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('更新用户角色错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 检查邮箱是否可用
   * GET /api/auth/check-email
   */
  checkEmail = async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '邮箱不能为空'
        });
      }

      const existingUser = await this.userService.findUserByEmail(email);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '检查完成',
        data: {
          available: !existingUser
        }
      });
      
    } catch (error) {
      logger.error('检查邮箱可用性错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 修改密码
   * PUT /api/user/password
   */
  changePassword = async (req, res) => {
    try {
      const userId = req.user.userId; // 从JWT中间件获取
      
      // 数据验证
      const passwordDto = new ChangePasswordDto(req.body);

      // 调用服务层处理密码修改
      const result = await this.userService.changePassword(userId, passwordDto.getData());
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('修改密码控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 刷新令牌
   * POST /api/auth/refresh
   */
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '刷新令牌不能为空'
        });
      }

      // 调用服务层处理令牌刷新
      const result = await this.userService.refreshToken(refreshToken);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('刷新令牌控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 用户登出
   * POST /api/auth/logout
   */
  logout = async (req, res) => {
    try {
      const userId = req.user.userId; // 从JWT中间件获取
      
      // 在实际应用中，这里可以将令牌加入黑名单
      // 目前只是简单返回成功响应
      
      logger.info('用户登出', { userId });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '登出成功'
      });
      
    } catch (error) {
      logger.error('登出控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 获取当前用户信息（简化版）
   * GET /api/user/me
   */
  getCurrentUser = async (req, res) => {
    try {
      const userId = req.user.userId; // 从JWT中间件获取
      
      const result = await this.userService.getUserInfo(userId);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      // 返回简化的用户信息
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
            id: result.data.user.id,
            username: result.data.user.username,
            email: result.data.user.email,
            avatar: result.data.user.avatar,
            status: result.data.user.status,
            roles: result.data.user.roles,
        }
      });
      
    } catch (error) {
      logger.error('获取当前用户信息控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 上传头像（更新版本 - 支持历史记录）
   * POST /api/user/avatar
   */
  uploadAvatar = async (req, res) => {
    try {
      const userId = req.user.userId;
      
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '请选择要上传的头像文件'
        });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      // 使用新的头像历史管理方法
      const result = await this.userService.updateAvatarWithHistory(userId, avatarUrl);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.json({
        success: true,
        message: '头像上传成功',
        data: {
          avatarUrl: avatarUrl
        }
      });
      
    } catch (error) {
      logger.error('上传头像错误:', error);
      res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 获取头像历史记录
   * GET /api/user/avatar/history
   */
  getAvatarHistory = async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const result = await this.userService.getAvatarHistory(userId);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.json({
        success: true,
        message: '获取头像历史成功',
        data: result.data
      });
      
    } catch (error) {
      logger.error('获取头像历史错误:', error);
      res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 切换到历史头像
   * PUT /api/user/avatar/switch/:historyId
   */
  switchToHistoryAvatar = async (req, res) => {
    try {
      const userId = req.user.userId;
      const historyId = parseInt(req.params.historyId);
      
      if (!historyId || isNaN(historyId)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '无效的历史记录ID'
        });
      }
      
      const result = await this.userService.switchToHistoryAvatar(userId, historyId);
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      res.json({
        success: true,
        message: '头像切换成功',
        data: result.data
      });
      
    } catch (error) {
      logger.error('切换头像错误:', error);
      res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  // ==================== 私有方法 ====================

  /**
   * 根据错误代码获取HTTP状态码
   * @param {string} errorCode - 错误代码
   * @returns {number} HTTP状态码
   */
  getStatusCodeByErrorCode(errorCode) {
    const errorCodeMap = {
      [ERROR_CODES.VALIDATION_ERROR]: HTTP_STATUS.BAD_REQUEST,
      [ERROR_CODES.USER_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
      [ERROR_CODES.USER_ALREADY_EXISTS]: HTTP_STATUS.CONFLICT,
      [ERROR_CODES.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
      [ERROR_CODES.ACCOUNT_DISABLED]: HTTP_STATUS.FORBIDDEN,
      [ERROR_CODES.TOKEN_INVALID]: HTTP_STATUS.UNAUTHORIZED,
      [ERROR_CODES.TOKEN_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
      [ERROR_CODES.PERMISSION_DENIED]: HTTP_STATUS.FORBIDDEN,
      [ERROR_CODES.INTERNAL_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR
    };

    return errorCodeMap[errorCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  /**
   * 获取所有用户列表（仅管理员可用）
   * GET /api/user/list
   */
  getAllUsers = async (req, res) => {
    console.log('用户==',req.user.roles)
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      
      // 调用服务层获取用户列表
      const result = await this.userService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      
      if (!result) {
        return res.error('获取用户列表失败')
      }
      res.success(result);
      
    } catch (error) {
      logger.error('获取所有用户控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 删除指定用户（仅管理员可用）
   * DELETE /api/user/:id
   */
  deleteUser = async (req, res) => {
    try {
      // 检查是否为管理员
      if (!req.user.roles.includes('admin')) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: ERROR_CODES.PERMISSION_DENIED,
          message: '权限不足，只有管理员可以删除用户'
        });
      }

      const { id } = req.params;
      const currentUserId = req.user.userId;
      
      // 防止管理员删除自己
      if (parseInt(id) === currentUserId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '不能删除自己的账户'
        });
      }
      
      // 调用服务层删除用户
      const result = await this.userService.deleteUser(parseInt(id));
      
      if (!result.success) {
        const statusCode = this.getStatusCodeByErrorCode(result.code);
        return res.status(statusCode).json(result);
      }

      // 记录删除操作
      logger.warn('管理员删除用户', {
        adminId: currentUserId,
        deletedUserId: id,
        ip: req.ip
      });

      res.status(HTTP_STATUS.OK).json(result);
      
    } catch (error) {
      logger.error('删除用户控制器错误:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: '服务器内部错误'
      });
    }
  };

  /**
   * 清理孤儿头像文件
   * POST /api/admin/avatar/cleanup
   */
  cleanOrphanAvatars = async (req, res) => {
      try {
          const result = await this.userService.cleanOrphanAvatars();
          
          if (!result.success) {
              const statusCode = this.getStatusCodeByErrorCode(result.code);
              return res.status(statusCode).json(result);
          }
          
          res.json(result);
          
      } catch (error) {
          logger.error('清理孤儿头像控制器错误:', error);
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
              success: false,
              code: ERROR_CODES.INTERNAL_ERROR,
              message: '服务器内部错误'
          });
      }
  };
}

module.exports = UserController;