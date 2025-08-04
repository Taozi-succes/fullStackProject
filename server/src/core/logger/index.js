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
    this.logDir = path.join(process.cwd(), 'logs'); // 日志目录路径  process.cwd() 当前工作目录，即项目根目录
    
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
    // 使用本地时间而不是UTC时间
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + 'T' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0') + '.' + 
      String(now.getMilliseconds()).padStart(3, '0') + '+08:00';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  /**
   * 写入日志文件
   */
  // 在 writeToFile 方法中，修改文件路径
  writeToFile(level, formattedMessage) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    // 修改为 app 子目录
    const filepath = path.join(this.logDir, 'app', filename);
    
    // 确保 app 目录存在
    const appLogDir = path.join(this.logDir, 'app');
    if (!fs.existsSync(appLogDir)) {
      fs.mkdirSync(appLogDir, { recursive: true });
    }
    
    fs.appendFileSync(filepath, formattedMessage + '\n');
    
    // 错误日志单独记录
    if (level === 'ERROR') {
      const errorFilename = `${date}-error.log`;
      const errorFilepath = path.join(this.logDir, 'app', errorFilename);
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