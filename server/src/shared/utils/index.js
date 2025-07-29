/**
 * 共享工具函数
 * 提供通用的工具方法
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../core/config');
const { ERROR_CODES } = require('../../common/constants');

/**
 * 密码工具类
 */
class PasswordUtils {
  /**
   * 加密密码
   */
  static async hash(password) {
    try {
      const saltRounds = config.get('security.bcryptRounds');
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error('密码加密失败');
    }
  }

  /**
   * 验证密码
   */
  static async verify(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('密码验证失败');
    }
  }

  /**
   * 生成随机密码
   */
  static generateRandom(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

/**
 * JWT工具类
 */
class JwtUtils {
  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload) {
    const secret = config.get('jwt.secret');
    const expiresIn = config.get('jwt.expiresIn');
    
    return jwt.sign(
      { ...payload, type: 'access' },
      secret,
      { expiresIn }
    );
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(payload) {
    const secret = config.get('jwt.secret');
    const expiresIn = config.get('jwt.refreshExpiresIn');
    
    return jwt.sign(
      { ...payload, type: 'refresh' },
      secret,
      { expiresIn }
    );
  }

  /**
   * 验证令牌
   */
  static verifyToken(token) {
    try {
      const secret = config.get('jwt.secret');
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error(ERROR_CODES.TOKEN_EXPIRED);
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }
      throw new Error(ERROR_CODES.TOKEN_INVALID);
    }
  }

  /**
   * 解码令牌（不验证）
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * 从请求头获取令牌
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }
}

/**
 * 字符串工具类
 */
class StringUtils {
  /**
   * 生成随机字符串
   */
  static generateRandom(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 首字母大写
   */
  static capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * 驼峰转下划线
   */
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线转驼峰
   */
  static snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 截断字符串
   */
  static truncate(str, length = 100, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }

  /**
   * 移除HTML标签
   */
  static stripHtml(str) {
    return str.replace(/<[^>]*>/g, '');
  }

  /**
   * 转义HTML
   */
  static escapeHtml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  }
}

/**
 * 对象工具类
 */
class ObjectUtils {
  /**
   * 深拷贝
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * 移除对象中的空值
   */
  static removeEmpty(obj) {
    const result = {};
    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * 选择对象中的指定字段
   */
  static pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * 排除对象中的指定字段
   */
  static omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }

  /**
   * 检查对象是否为空
   */
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }
}

/**
 * 数组工具类
 */
class ArrayUtils {
  /**
   * 数组去重
   */
  static unique(arr) {
    return [...new Set(arr)];
  }

  /**
   * 数组分块
   */
  static chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组随机排序
   */
  static shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 获取随机元素
   */
  static random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

/**
 * 时间工具类
 */
class DateUtils {
  /**
   * 格式化日期
   */
  static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取时间差（毫秒）
   */
  static diff(date1, date2) {
    return Math.abs(new Date(date1) - new Date(date2));
  }

  /**
   * 添加时间
   */
  static add(date, amount, unit = 'days') {
    const d = new Date(date);
    switch (unit) {
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    return d;
  }

  /**
   * 检查是否为今天
   */
  static isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
  }
}

/**
 * 验证工具类
 */
class ValidationUtils {
  /**
   * 验证邮箱
   */
  static isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号
   */
  static isPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证URL
   */
  static isUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证IP地址
   */
  static isIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 验证身份证号
   */
  static isIdCard(idCard) {
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return idCardRegex.test(idCard);
  }
}

module.exports = {
  PasswordUtils,
  JwtUtils,
  StringUtils,
  ObjectUtils,
  ArrayUtils,
  DateUtils,
  ValidationUtils
};