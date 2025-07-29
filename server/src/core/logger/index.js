/**
 * 企业级日志系统
 * 支持多级别日志、文件输出、格式化等功能
 */
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.NODE_ENV === 'production' ? this.levels.INFO : this.levels.DEBUG;
    this.logDir = path.join(process.cwd(), 'logs');
    
    // 确保日志目录存在
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  /**
   * 写入日志文件
   */
  writeToFile(level, formattedMessage) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    const filepath = path.join(this.logDir, filename);
    
    fs.appendFileSync(filepath, formattedMessage + '\n');
    
    // 错误日志单独记录
    if (level === 'ERROR') {
      const errorFilename = `${date}-error.log`;
      const errorFilepath = path.join(this.logDir, errorFilename);
      fs.appendFileSync(errorFilepath, formattedMessage + '\n');
    }
  }

  /**
   * 输出日志
   */
  log(level, message, meta = {}) {
    const levelValue = this.levels[level];
    
    if (levelValue <= this.currentLevel) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      // 控制台输出
      switch (level) {
        case 'ERROR':
          console.error(`\x1b[31m${formattedMessage}\x1b[0m`);
          break;
        case 'WARN':
          console.warn(`\x1b[33m${formattedMessage}\x1b[0m`);
          break;
        case 'INFO':
          console.info(`\x1b[36m${formattedMessage}\x1b[0m`);
          break;
        case 'DEBUG':
          console.log(`\x1b[37m${formattedMessage}\x1b[0m`);
          break;
        default:
          console.log(formattedMessage);
      }
      
      // 文件输出
      this.writeToFile(level, formattedMessage);
    }
  }

  /**
   * 错误日志
   */
  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  /**
   * 警告日志
   */
  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  /**
   * 信息日志
   */
  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  /**
   * 调试日志
   */
  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  /**
   * HTTP请求日志中间件
   */
  httpLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;
      
      res.send = function(data) {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress
        };
        
        const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
        logger.log(level, `${req.method} ${req.url}`, logData);
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }
}

const logger = new Logger();
module.exports = logger;