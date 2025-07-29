/**
 * 企业级配置管理
 * 统一管理所有应用配置，支持环境变量和默认值
 */
require('dotenv').config();

class ConfigService {
  constructor() {
    this.config = {
      // 服务器配置
      server: {
        port: this.getNumber('PORT', 3000),
        host: this.getString('HOST', '0.0.0.0'),
        nodeEnv: this.getString('NODE_ENV', 'development')
      },

      // 数据库配置
      database: {
        url: this.getString('DATABASE_URL', 'mysql://root:1234@localhost:3306/express_demo')
      },

      // JWT配置
      jwt: {
        secret: this.getString('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
        expiresIn: this.getString('JWT_EXPIRES_IN', '24h'),
        refreshExpiresIn: this.getString('JWT_REFRESH_EXPIRES_IN', '7d')
      },

      // 验证码配置
      captcha: {
        length: this.getNumber('CAPTCHA_LENGTH', 4),
        width: this.getNumber('CAPTCHA_WIDTH', 120),
        height: this.getNumber('CAPTCHA_HEIGHT', 40),
        fontSize: this.getNumber('CAPTCHA_FONT_SIZE', 50),
        noise: this.getNumber('CAPTCHA_NOISE', 2),
        color: this.getBoolean('CAPTCHA_COLOR', true)
      },

      // 安全配置
      security: {
        bcryptRounds: this.getNumber('BCRYPT_ROUNDS', 12),
        rateLimitWindowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15分钟
        rateLimitMaxRequests: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
        corsOrigin: this.getString('CORS_ORIGIN', '*'),
        helmetEnabled: this.getBoolean('HELMET_ENABLED', true)
      },

      // 文件上传配置
      upload: {
        maxFileSize: this.getNumber('MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB
        allowedMimeTypes: this.getArray('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/gif']),
        uploadDir: this.getString('UPLOAD_DIR', 'uploads')
      },

      // 日志配置
      logging: {
        level: this.getString('LOG_LEVEL', 'info'),
        maxFiles: this.getNumber('LOG_MAX_FILES', 14),
        maxSize: this.getString('LOG_MAX_SIZE', '20m')
      },

      // Redis配置
      redis: {
        host: this.getString('REDIS_HOST', 'localhost'),
        port: this.getNumber('REDIS_PORT', 6379),
        password: this.getString('REDIS_PASSWORD', ''),
        db: this.getNumber('REDIS_DB', 0),
        keyPrefix: this.getString('REDIS_KEY_PREFIX', 'express_app:'),
        connectTimeout: this.getNumber('REDIS_CONNECT_TIMEOUT', 10000),
        lazyConnect: this.getBoolean('REDIS_LAZY_CONNECT', true),
        retryDelayOnFailover: this.getNumber('REDIS_RETRY_DELAY', 100),
        maxRetriesPerRequest: this.getNumber('REDIS_MAX_RETRIES', 3)
      }
    };

    // 验证必要配置
    this.validateConfig();
  }

  /**
   * 获取字符串配置
   */
  getString(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  /**
   * 获取数字配置
   */
  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * 获取布尔配置
   */
  getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * 获取数组配置
   */
  getArray(key, defaultValue = []) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim());
  }

  /**
   * 验证必要配置
   */
  validateConfig() {
    const requiredConfigs = [
      'database.url',
      'jwt.secret'
    ];

    for (const configPath of requiredConfigs) {
      const value = this.get(configPath);
      if (!value) {
        throw new Error(`Missing required configuration: ${configPath}`);
      }
    }

    // 生产环境额外验证
    if (this.isProduction()) {
      if (this.config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
        throw new Error('JWT secret must be changed in production environment');
      }
    }
  }

  /**
   * 获取配置值
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return this.config;
  }

  /**
   * 是否为开发环境
   */
  isDevelopment() {
    return this.config.server.nodeEnv === 'development';
  }

  /**
   * 是否为生产环境
   */
  isProduction() {
    return this.config.server.nodeEnv === 'production';
  }

  /**
   * 是否为测试环境
   */
  isTest() {
    return this.config.server.nodeEnv === 'test';
  }
}

const configInstance = new ConfigService();
module.exports = configInstance;