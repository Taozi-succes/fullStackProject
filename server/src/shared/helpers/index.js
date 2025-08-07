/**
 * 共享助手函数
 * 提供中间件和通用助手函数
 */
const { JwtUtils } = require('../utils')
const logger = require('../../core/logger')
const {
  HTTP_STATUS,
  ERROR_CODES,
  RESPONSE_MESSAGES,
} = require('../../common/constants')
const { UserStatusEnum } = require('../../common/enums')
const databaseService = require('../../core/database/prisma')

/**
 * JWT认证中间件
 * 验证请求中的JWT令牌
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization)

    console.log('获取令牌===', token)

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: ERROR_CODES.TOKEN_MISSING,
        message: '访问令牌缺失',
      })
    }

    // 验证令牌
    const decoded = JwtUtils.verifyToken(token)

    if (decoded.type !== 'access') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: ERROR_CODES.TOKEN_INVALID,
        message: '令牌类型错误',
      })
    }

    // 检查用户是否存在且状态正常
    const prisma = databaseService.getClient()
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        roles: true,
      },
    })

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: ERROR_CODES.USER_NOT_FOUND,
        message: RESPONSE_MESSAGES.USER_NOT_FOUND,
      })
    }

    if (user.status !== UserStatusEnum.ACTIVE) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: ERROR_CODES.ACCOUNT_DISABLED,
        message: '账户已被禁用',
      })
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: JSON.parse(user.roles),
    }

    next()
  } catch (error) {
    logger.error('JWT认证中间件错误:', error)

    if (error.message.includes('TOKEN_')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        code: error.message,
        message: RESPONSE_MESSAGES.TOKEN_INVALID,
      })
    }

    return res.error('认证服务异常11', ERROR_CODES.TOKEN_INVALID)
  }
}

/**
 * 可选JWT认证中间件
 * 如果有令牌则验证，没有令牌则跳过
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      // 没有令牌，直接跳过
      return next()
    }

    // 有令牌，进行验证
    const decoded = JwtUtils.verifyToken(token)

    if (decoded.type === 'access') {
      const prisma = databaseService.getClient()
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
        },
      })

      if (user && user.status === UserStatusEnum.ACTIVE) {
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
        }
      }
    }

    next()
  } catch (error) {
    // 可选认证中，令牌验证失败时不返回错误，直接跳过
    logger.warn('可选JWT认证失败:', error.message)
    next()
  }
}

/**
 * 角色权限中间件（改进版）
 * 检查用户是否具有指定角色
 * @param {string|Array} requiredRoles - 必需的角色，可以是字符串或数组
 * @param {Object} options - 配置选项
 * @param {boolean} options.requireAll - 是否需要拥有所有角色（默认false，只需要其中一个）
 * @param {boolean} options.strict - 严格模式，角色名必须完全匹配（默认true）
 */
const requireRole = (requiredRoles, options = {}) => {
  return (req, res, next) => {
    // 检查用户是否有角色信息
    if (!req.user.roles || !Array.isArray(req.user.roles)) {
      logger.warn('用户角色信息缺失', { userId: req.user.userId })
      return res.error(
        '用户角色信息缺失，无法进行权限检查!!',
        ERROR_CODES.INSUFFICIENT_PERMISSIONS
      )
    }

    // 标准化必需角色为数组
    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles]
    const userRoles = req.user.roles

    // 配置选项
    const { requireAll = false, strict = true } = options

    // 角色匹配函数
    const roleMatches = (userRole, requiredRole) => {
      if (strict) {
        return userRole === requiredRole
      } else {
        return userRole.toLowerCase() === requiredRole.toLowerCase()
      }
    }

    // 检查权限逻辑
    let hasPermission = false

    if (requireAll) {
      // 需要拥有所有指定角色
      hasPermission = rolesArray.every((requiredRole) =>
        userRoles.some((userRole) => roleMatches(userRole, requiredRole))
      )
    } else {
      // 只需要拥有其中一个角色
      hasPermission = rolesArray.some((requiredRole) =>
        userRoles.some((userRole) => roleMatches(userRole, requiredRole))
      )
    }

    if (!hasPermission) {
      logger.warn('权限检查认证不通过', {
        userId: req.user.userId,
        userRoles: userRoles,
        requiredRoles: rolesArray,
        requireAll: requireAll,
      })

      return res.error(
        '权限不足，无法访问此资源!!',
        ERROR_CODES.INSUFFICIENT_PERMISSIONS
      )
    }

    // 权限检查通过，记录日志
    logger.info('权限检查通过', {
      userId: req.user.userId,
      userRoles: userRoles,
      requiredRoles: rolesArray,
    })

    next()
  }
}

/**
 * 请求日志中间件
 * 记录HTTP请求信息
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // 记录请求开始
  logger.info('HTTP请求开始', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
  })

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime

    logger.info('HTTP请求完成', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    })
  })

  next()
}

/**
 * 错误处理中间件
 * 统一处理应用错误
 */
const errorHandler = (error, req, res, next) => {
  logger.error('应用错误:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
  })

  // Prisma错误处理
  if (error.code && error.code.startsWith('P')) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: ERROR_CODES.DATABASE_ERROR,
      message: '数据库操作失败',
    })
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: ERROR_CODES.TOKEN_INVALID,
      message: RESPONSE_MESSAGES.TOKEN_INVALID,
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: RESPONSE_MESSAGES.TOKEN_EXPIRED,
    })
  }

  // 验证错误处理
  if (error.name === 'ValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: error.message,
    })
  }

  // 默认错误处理
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: '服务器内部错误',
  })
}

/**
 * 404处理中间件
 * 处理未找到的路由
 */
const notFoundHandler = (req, res) => {
  logger.warn('404 - 路由未找到', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  })

  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    code: ERROR_CODES.ROUTE_NOT_FOUND,
    message: '请求的资源不存在',
  })
}

/**
 * CORS中间件配置
 * 处理跨域请求
 */
const corsOptions = {
  origin: (origin, callback) => {
    // 允许的域名列表（可以从配置文件读取）
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://117.72.189.59',
      'https://117.72.189.59',
    ]

    // 开发环境允许所有域名
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }

    // 生产环境检查域名白名单
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('不允许的跨域请求'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

/**
 * 响应格式化中间件
 * 统一API响应格式
 */
const responseFormatter = (req, res, next) => {
  // 成功响应格式化
  res.success = (data = null, message = '操作成功', code = 200) => {
    res.status(code).json({
      success: true,
      message,
      data,
      timestamp: new Date().toLocaleString(),
    })
  }

  // 错误响应格式化
  res.error = (
    message = '操作失败',
    code = ERROR_CODES.INTERNAL_ERROR,
    statusCode = HTTP_STATUS.OK
  ) => {
    res.status(statusCode).json({
      success: false,
      code,
      message,
      timestamp: new Date().toLocaleString(),
    })
  }

  next()
}

/**
 * 分页助手函数
 * 处理分页参数
 */
const paginationHelper = {
  /**
   * 获取分页参数
   * @param {Object} query - 查询参数
   * @returns {Object} 分页信息
   */
  getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10))
    const skip = (page - 1) * limit

    return {
      page,
      limit,
      skip,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    }
  },

  /**
   * 格式化分页响应
   * @param {Array} data - 数据列表
   * @param {number} total - 总数量
   * @param {Object} params - 分页参数
   * @returns {Object} 分页响应
   */
  formatPaginationResponse(data, total, params) {
    const { page, limit } = params
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        current: page,
        total: totalPages,
        count: data.length,
        totalCount: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  },
}

/**
 * 缓存助手函数
 * 简单的内存缓存实现
 */
class CacheHelper {
  constructor() {
    this.cache = new Map()
    this.ttl = new Map()
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttlSeconds - 过期时间（秒）
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + ttlSeconds * 1000)
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值
   */
  get(key) {
    const expireTime = this.ttl.get(key)

    if (!expireTime || Date.now() > expireTime) {
      this.delete(key)
      return null
    }

    return this.cache.get(key)
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key)
    this.ttl.delete(key)
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear()
    this.ttl.clear()
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()

    for (const [key, expireTime] of this.ttl.entries()) {
      if (now > expireTime) {
        this.delete(key)
      }
    }
  }
}

// 创建全局缓存实例
const globalCache = new CacheHelper()

// 定期清理过期缓存
setInterval(() => {
  globalCache.cleanup()
}, 60000) // 每分钟清理一次

/**
 * 文件上传助手函数
 */
const fileUploadHelper = {
  /**
   * 检查文件类型
   * @param {string} mimetype - 文件MIME类型
   * @param {Array} allowedTypes - 允许的类型
   * @returns {boolean} 是否允许
   */
  isAllowedFileType(mimetype, allowedTypes) {
    return allowedTypes.includes(mimetype)
  },

  /**
   * 检查文件大小
   * @param {number} size - 文件大小（字节）
   * @param {number} maxSize - 最大大小（字节）
   * @returns {boolean} 是否允许
   */
  isAllowedFileSize(size, maxSize) {
    return size <= maxSize
  },

  /**
   * 生成唯一文件名
   * @param {string} originalName - 原始文件名
   * @returns {string} 唯一文件名
   */
  generateUniqueFileName(originalName) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    const extension = originalName.split('.').pop()

    return `${timestamp}_${random}.${extension}`
  },
}

module.exports = {
  // 认证中间件
  authenticateToken,
  optionalAuth,
  requireRole,

  // 通用中间件
  requestLogger,
  errorHandler,
  notFoundHandler,
  responseFormatter,

  // 配置
  corsOptions,

  // 助手函数
  paginationHelper,
  CacheHelper,
  globalCache,
  fileUploadHelper,
}
