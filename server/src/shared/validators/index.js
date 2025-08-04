/**
 * 共享验证器
 * 提供通用的验证中间件和验证函数
 */
const { body, param, query, validationResult } = require('express-validator');
const { ValidationUtils } = require('../utils');
const { HTTP_STATUS, ERROR_CODES } = require('../../common/constants');
const logger = require('../../core/logger');

/**
 * 验证结果处理中间件
 * 检查验证结果并返回错误信息
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('请求参数验证失败', {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
      body: req.body
    });

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: '请求参数验证失败',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * 用户注册验证规则
 */
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线')
    .custom(value => {
      if (value.startsWith('_') || value.endsWith('_')) {
        throw new Error('用户名不能以下划线开头或结尾');
      }
      return true;
    }),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail()
    .custom(value => {
      if (!ValidationUtils.isEmail(value)) {
        throw new Error('邮箱格式不正确');
      }
      return true;
    }),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('确认密码与密码不匹配');
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * 用户登录验证规则
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名或邮箱不能为空')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名或邮箱长度不正确'),
    
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 1, max: 128 })
    .withMessage('密码长度不正确'),
    
  body('captcha')
    .optional()
    .trim()
    .isLength({ min: 4, max: 6 })
    .withMessage('验证码长度不正确'),
    
  body('captchaId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('验证码ID不能为空'),
    
  handleValidationErrors
];

/**
 * 更新用户信息验证规则
 */
const validateUpdateUser = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
    
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('头像必须是有效的URL'),
    
  handleValidationErrors
];

/**
 * 修改密码验证规则
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
    
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('新密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('新密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配');
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * 验证码验证规则
 */
const validateCaptcha = [
  body('captchaCode')
    .trim()
    .notEmpty()
    .withMessage('验证码不能为空')
    .isLength({ min: 1, max: 10 })
    .withMessage('验证码长度不正确')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('验证码只能包含字母和数字'),
    
  body('captchaId')
    .trim()
    .notEmpty()
    .withMessage('验证码ID不能为空')
    .matches(/^captcha:\d+_[a-zA-Z0-9]{8}$/)
    .withMessage('验证码ID格式不正确'),
    
  handleValidationErrors
];

/**
 * 刷新令牌验证规则
 */
const validateRefreshToken = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('刷新令牌不能为空')
    .isJWT()
    .withMessage('刷新令牌格式不正确'),
    
  handleValidationErrors
];

/**
 * ID参数验证规则
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
    .toInt(),
    
  handleValidationErrors
];

/**
 * 分页参数验证规则
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
    .toInt(),
    
  query('sortBy')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('排序字段长度不正确'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向只能是asc或desc'),
    
  handleValidationErrors
];

/**
 * 搜索参数验证规则
 */
const validateSearch = [
  query('keyword')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100个字符之间')
    .escape(), // 转义HTML字符
    
  handleValidationErrors
];

/**
 * 文件上传验证规则
 */
const validateFileUpload = [
  body('fileType')
    .optional()
    .isIn(['image', 'document', 'video', 'audio'])
    .withMessage('文件类型不支持'),
    
  handleValidationErrors
];

/**
 * 自定义验证器：检查字段唯一性
 * @param {string} field - 字段名
 * @param {Function} checkFunction - 检查函数
 * @returns {Function} 验证器函数
 */
const validateUnique = (field, checkFunction) => {
  return body(field).custom(async (value, { req }) => {
    if (!value) return true; // 如果值为空，跳过唯一性检查
    
    const exists = await checkFunction(value, req.user?.userId);
    if (exists) {
      throw new Error(`${field}已存在`);
    }
    return true;
  });
};

/**
 * 自定义验证器：检查密码强度
 */
const validatePasswordStrength = body('password').custom(value => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecialChar = /[@$!%*?&]/.test(value);
  
  if (value.length < minLength) {
    throw new Error(`密码长度至少${minLength}个字符`);
  }
  
  if (!hasUpperCase) {
    throw new Error('密码必须包含至少一个大写字母');
  }
  
  if (!hasLowerCase) {
    throw new Error('密码必须包含至少一个小写字母');
  }
  
  if (!hasNumbers) {
    throw new Error('密码必须包含至少一个数字');
  }
  
  if (!hasSpecialChar) {
    throw new Error('密码必须包含至少一个特殊字符(@$!%*?&)');
  }
  
  return true;
});

/**
 * 自定义验证器：检查手机号格式
 */
const validatePhoneNumber = body('phone').optional().custom(value => {
  if (value && !ValidationUtils.isValidPhone(value)) {
    throw new Error('手机号格式不正确');
  }
  return true;
});

/**
 * 自定义验证器：检查URL格式
 */
const validateUrl = (field) => {
  return body(field).optional().custom(value => {
    if (value && !ValidationUtils.isValidUrl(value)) {
      throw new Error(`${field}必须是有效的URL`);
    }
    return true;
  });
};

/**
 * 自定义验证器：检查IP地址格式
 */
const validateIpAddress = body('ip').optional().custom(value => {
  if (value && !ValidationUtils.isValidIp(value)) {
    throw new Error('IP地址格式不正确');
  }
  return true;
});

/**
 * 验证器工具类
 */
class ValidatorUtils {
  /**
   * 创建自定义验证规则
   * @param {Object} rules - 验证规则配置
   * @returns {Array} 验证规则数组
   */
  static createCustomRules(rules) {
    const validators = [];
    
    Object.entries(rules).forEach(([field, config]) => {
      let validator = body(field);
      
      // 应用配置
      if (config.optional) {
        validator = validator.optional();
      }
      
      if (config.trim) {
        validator = validator.trim();
      }
      
      if (config.notEmpty) {
        validator = validator.notEmpty().withMessage(`${field}不能为空`);
      }
      
      if (config.length) {
        validator = validator.isLength(config.length)
          .withMessage(`${field}长度必须在${config.length.min}-${config.length.max}个字符之间`);
      }
      
      if (config.matches) {
        validator = validator.matches(config.matches.pattern)
          .withMessage(config.matches.message || `${field}格式不正确`);
      }
      
      if (config.isIn) {
        validator = validator.isIn(config.isIn.values)
          .withMessage(config.isIn.message || `${field}值不在允许范围内`);
      }
      
      if (config.custom) {
        validator = validator.custom(config.custom);
      }
      
      validators.push(validator);
    });
    
    validators.push(handleValidationErrors);
    return validators;
  }
  
  /**
   * 组合多个验证规则
   * @param {...Array} ruleArrays - 验证规则数组
   * @returns {Array} 组合后的验证规则
   */
  static combineRules(...ruleArrays) {
    const combined = [];
    
    ruleArrays.forEach(rules => {
      // 移除每个规则数组中的handleValidationErrors
      const filteredRules = rules.filter(rule => rule !== handleValidationErrors);
      combined.push(...filteredRules);
    });
    
    // 最后添加一个handleValidationErrors
    combined.push(handleValidationErrors);
    
    return combined;
  }
}

module.exports = {
  // 验证中间件
  handleValidationErrors,
  
  // 预定义验证规则
  validateRegister,
  validateLogin,
  validateUpdateUser,
  validateChangePassword,
  validateCaptcha,
  validateRefreshToken,
  validateId,
  validatePagination,
  validateSearch,
  validateFileUpload,
  
  // 自定义验证器
  validateUnique,
  validatePasswordStrength,
  validatePhoneNumber,
  validateUrl,
  validateIpAddress,
  
  // 工具类
  ValidatorUtils
};