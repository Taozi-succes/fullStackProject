/**
 * 应用常量定义
 * 统一管理所有常量，避免魔法数字和字符串
 */

// HTTP状态码
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// 响应消息
const RESPONSE_MESSAGES = {
  // 通用消息
  SUCCESS: '操作成功',
  FAILED: '操作失败',
  INVALID_PARAMS: '参数无效',
  INTERNAL_ERROR: '服务器内部错误',
  NOT_FOUND: '资源不存在',
  FORBIDDEN: '访问被禁止',
  TOO_MANY_REQUESTS: '请求过于频繁，请稍后再试',

  // 认证相关
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAILED: '登录失败',
  LOGOUT_SUCCESS: '退出成功',
  TOKEN_INVALID: '令牌无效',
  TOKEN_EXPIRED: '令牌已过期',
  TOKEN_MISSING: '缺少访问令牌',
  UNAUTHORIZED: '未授权访问',
  PERMISSION_DENIED: '权限不足',

  // 用户相关
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户已存在',
  USER_CREATED: '用户创建成功',
  USER_UPDATED: '用户信息更新成功',
  USER_DELETED: '用户删除成功',
  PASSWORD_INCORRECT: '密码错误',
  PASSWORD_UPDATED: '密码更新成功',

  // 验证码相关
  CAPTCHA_GENERATED: '验证码生成成功',
  CAPTCHA_INVALID: '验证码无效',
  CAPTCHA_EXPIRED: '验证码已过期',
  CAPTCHA_REQUIRED: '请输入验证码',

  // 验证相关
  VALIDATION_FAILED: '数据验证失败',
  EMAIL_INVALID: '邮箱格式无效',
  PASSWORD_TOO_SHORT: '密码长度不能少于6位',
  USERNAME_REQUIRED: '用户名不能为空',
  EMAIL_REQUIRED: '邮箱不能为空',
  PASSWORD_REQUIRED: '密码不能为空'
};

// 用户状态
const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BANNED: 'DELETED'
};

// 令牌类型
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

// 验证码类型
const CAPTCHA_TYPES = {
  LOGIN: 'login',
  REGISTER: 'register',
  RESET_PASSWORD: 'reset_password'
};

// 文件类型
const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio'
};

// 支持的图片格式
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// 缓存键前缀
const CACHE_KEYS = {
  USER_SESSION: 'user:session:',
  CAPTCHA: 'captcha:',
  RATE_LIMIT: 'rate_limit:',
  REFRESH_TOKEN: 'refresh_token:'
};

// 时间常量（毫秒）
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

// 验证规则
const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 128,
    // PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{3,}$/ // 至少包含一个小写字母，一个大写字母和一个数字，长度为6到128位
    // 至少包含一个字母，和一个数字，长度为6到128位
    PATTERN: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{3,}$/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

// 分页默认值
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// 错误代码
const ERROR_CODES = {
  // 通用错误
  UNKNOWN_ERROR: 1001,
  VALIDATION_ERROR: 1002,
  AUTHENTICATION_ERROR: 1003,
  AUTHORIZATION_ERROR: 1004,
  NOT_FOUND_ERROR: 1005,
  CONFLICT_ERROR: 1006,
  RATE_LIMIT_ERROR: 1007,
  INSUFFICIENT_PERMISSIONS: 1008,  // 权限不足错误码

  // 用户相关错误
  USER_NOT_FOUND: 2001,
  USER_ALREADY_EXISTS: 2002,
  INVALID_CREDENTIALS: 2003,
  ACCOUNT_DISABLED: 2004,

  // 令牌相关错误
  TOKEN_INVALID: 3001,
  TOKEN_EXPIRED: 3002,
  TOKEN_MISSING: 3003,

  // 验证码相关错误
  CAPTCHA_INVALID: 4001,
  CAPTCHA_EXPIRED: 4002,
  CAPTCHA_REQUIRED: 4003
};

module.exports = {
  HTTP_STATUS,
  RESPONSE_MESSAGES,
  USER_STATUS,
  TOKEN_TYPES,
  CAPTCHA_TYPES,
  FILE_TYPES,
  SUPPORTED_IMAGE_TYPES,
  CACHE_KEYS,
  TIME_CONSTANTS,
  VALIDATION_RULES,
  PAGINATION,
  ERROR_CODES
};