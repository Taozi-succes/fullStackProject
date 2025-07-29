/**
 * 应用枚举定义
 * 提供类型安全的枚举值
 */

/**
 * 用户状态枚举
 */
class UserStatusEnum {
  static ACTIVE = 'ACTIVE';
  static INACTIVE = 'INACTIVE';
  static BANNED = 'BANNED';

  static getAll() {
    return [this.ACTIVE, this.INACTIVE, this.BANNED];
  }

  static isValid(status) {
    return this.getAll().includes(status);
  }

  static getDescription(status) {
    const descriptions = {
      [this.ACTIVE]: '活跃',
      [this.INACTIVE]: '非活跃',
      [this.BANNED]: '已封禁'
    };
    return descriptions[status] || '未知状态';
  }
}

/**
 * HTTP方法枚举
 */
class HttpMethodEnum {
  static GET = 'GET';
  static POST = 'POST';
  static PUT = 'PUT';
  static PATCH = 'PATCH';
  static DELETE = 'DELETE';
  static OPTIONS = 'OPTIONS';
  static HEAD = 'HEAD';

  static getAll() {
    return [this.GET, this.POST, this.PUT, this.PATCH, this.DELETE, this.OPTIONS, this.HEAD];
  }

  static isValid(method) {
    return this.getAll().includes(method?.toUpperCase());
  }
}

/**
 * 内容类型枚举
 */
class ContentTypeEnum {
  static JSON = 'application/json';
  static FORM_DATA = 'multipart/form-data';
  static URL_ENCODED = 'application/x-www-form-urlencoded';
  static TEXT_PLAIN = 'text/plain';
  static TEXT_HTML = 'text/html';
  static IMAGE_JPEG = 'image/jpeg';
  static IMAGE_PNG = 'image/png';
  static IMAGE_GIF = 'image/gif';
  static IMAGE_WEBP = 'image/webp';

  static getImageTypes() {
    return [this.IMAGE_JPEG, this.IMAGE_PNG, this.IMAGE_GIF, this.IMAGE_WEBP];
  }

  static isImageType(contentType) {
    return this.getImageTypes().includes(contentType);
  }
}

/**
 * 日志级别枚举
 */
class LogLevelEnum {
  static ERROR = 'ERROR';
  static WARN = 'WARN';
  static INFO = 'INFO';
  static DEBUG = 'DEBUG';

  static getAll() {
    return [this.ERROR, this.WARN, this.INFO, this.DEBUG];
  }

  static getPriority(level) {
    const priorities = {
      [this.ERROR]: 0,
      [this.WARN]: 1,
      [this.INFO]: 2,
      [this.DEBUG]: 3
    };
    return priorities[level] ?? 999;
  }

  static isValid(level) {
    return this.getAll().includes(level);
  }
}

/**
 * 环境枚举
 */
class EnvironmentEnum {
  static DEVELOPMENT = 'development';
  static PRODUCTION = 'production';
  static TEST = 'test';
  static STAGING = 'staging';

  static getAll() {
    return [this.DEVELOPMENT, this.PRODUCTION, this.TEST, this.STAGING];
  }

  static isValid(env) {
    return this.getAll().includes(env);
  }

  static isDevelopment(env) {
    return env === this.DEVELOPMENT;
  }

  static isProduction(env) {
    return env === this.PRODUCTION;
  }

  static isTest(env) {
    return env === this.TEST;
  }
}

/**
 * 排序方向枚举
 */
class SortDirectionEnum {
  static ASC = 'asc';
  static DESC = 'desc';

  static getAll() {
    return [this.ASC, this.DESC];
  }

  static isValid(direction) {
    return this.getAll().includes(direction?.toLowerCase());
  }

  static normalize(direction) {
    return direction?.toLowerCase() === this.DESC ? this.DESC : this.ASC;
  }
}

/**
 * 验证码类型枚举
 */
class CaptchaTypeEnum {
  static LOGIN = 'login';
  static REGISTER = 'register';
  static RESET_PASSWORD = 'reset_password';
  static CHANGE_EMAIL = 'change_email';

  static getAll() {
    return [this.LOGIN, this.REGISTER, this.RESET_PASSWORD, this.CHANGE_EMAIL];
  }

  static isValid(type) {
    return this.getAll().includes(type);
  }

  static getDescription(type) {
    const descriptions = {
      [this.LOGIN]: '登录验证码',
      [this.REGISTER]: '注册验证码',
      [this.RESET_PASSWORD]: '重置密码验证码',
      [this.CHANGE_EMAIL]: '更换邮箱验证码'
    };
    return descriptions[type] || '未知类型';
  }
}

/**
 * 令牌类型枚举
 */
class TokenTypeEnum {
  static ACCESS = 'access';
  static REFRESH = 'refresh';
  static RESET_PASSWORD = 'reset_password';
  static EMAIL_VERIFICATION = 'email_verification';

  static getAll() {
    return [this.ACCESS, this.REFRESH, this.RESET_PASSWORD, this.EMAIL_VERIFICATION];
  }

  static isValid(type) {
    return this.getAll().includes(type);
  }

  static getExpiresIn(type) {
    const expirations = {
      [this.ACCESS]: '24h',
      [this.REFRESH]: '7d',
      [this.RESET_PASSWORD]: '1h',
      [this.EMAIL_VERIFICATION]: '24h'
    };
    return expirations[type] || '1h';
  }
}

/**
 * 文件大小单位枚举
 */
class FileSizeUnitEnum {
  static BYTE = 'B';
  static KILOBYTE = 'KB';
  static MEGABYTE = 'MB';
  static GIGABYTE = 'GB';

  static getMultiplier(unit) {
    const multipliers = {
      [this.BYTE]: 1,
      [this.KILOBYTE]: 1024,
      [this.MEGABYTE]: 1024 * 1024,
      [this.GIGABYTE]: 1024 * 1024 * 1024
    };
    return multipliers[unit] || 1;
  }

  static formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = [this.BYTE, this.KILOBYTE, this.MEGABYTE, this.GIGABYTE];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, index)).toFixed(2);
    
    return `${size} ${units[index]}`;
  }
}

module.exports = {
  UserStatusEnum,
  HttpMethodEnum,
  ContentTypeEnum,
  LogLevelEnum,
  EnvironmentEnum,
  SortDirectionEnum,
  CaptchaTypeEnum,
  TokenTypeEnum,
  FileSizeUnitEnum
};