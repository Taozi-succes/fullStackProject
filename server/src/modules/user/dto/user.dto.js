/**
 * 用户数据传输对象
 * 定义API请求和响应的数据结构
 */
const { VALIDATION_RULES } = require('../../../common/constants');
const { ValidationUtils } = require('../../../shared/utils');

/**
 * 用户登录DTO
 */
class LoginDto {
  constructor(data) {
    this.username = data.username?.trim();
    this.password = data.password;
    this.captchaId = data.captchaId;
    this.captchaCode = data.captchaCode?.trim();
    this.rememberMe = Boolean(data.rememberMe);
  }

  // 数据验证已经在中间层validateLogin完成，此处不再重复验证  /shared/validation/index.js

  /**
   * 获取数据
   */
  getData() {
    return {
      username: this.username,
      password: this.password,
      captchaId: this.captchaId,
      captchaCode: this.captchaCode,
      rememberMe: this.rememberMe
    };
  }

}

/**
 * 用户注册DTO
 */
class RegisterDto {
  constructor(data) {
    this.username = data.username?.trim();
    this.email = data.email?.trim().toLowerCase();
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.captchaId = data.captchaId;
    this.captchaCode = data.captchaCode?.trim();
    this.agreeTerms = Boolean(data.agreeTerms);
  }

  /**
   * 获取数据
   */
  getData() {
    return {
      username: this.username,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword,
      captchaId: this.captchaId,
      captchaCode: this.captchaCode,
      agreeTerms: this.agreeTerms
    };
  }

  /**
   * 验证注册数据
   */
  validate() {
    const errors = [];

    // 验证用户名
    if (!this.username) {
      errors.push({
        field: 'username',
        message: '用户名不能为空'
      });
    } else if (this.username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
      errors.push({
        field: 'username',
        message: `用户名长度不能少于${VALIDATION_RULES.USERNAME.MIN_LENGTH}位`
      });
    } else if (this.username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
      errors.push({
        field: 'username',
        message: `用户名长度不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}位`
      });
    } else if (!VALIDATION_RULES.USERNAME.PATTERN.test(this.username)) {
      errors.push({
        field: 'username',
        message: '用户名只能包含字母、数字和下划线'
      });
    }

    // 验证邮箱
    if (!this.email) {
      errors.push({
        field: 'email',
        message: '邮箱不能为空'
      });
    } else if (!ValidationUtils.isEmail(this.email)) {
      errors.push({
        field: 'email',
        message: '邮箱格式无效'
      });
    }

    // 验证密码
    if (!this.password) {
      errors.push({
        field: 'password',
        message: '密码不能为空'
      });
    } else if (this.password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
      errors.push({
        field: 'password',
        message: `密码长度不能少于${VALIDATION_RULES.PASSWORD.MIN_LENGTH}位`
      });
    } else if (this.password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
      errors.push({
        field: 'password',
        message: `密码长度不能超过${VALIDATION_RULES.PASSWORD.MAX_LENGTH}位`
      });
    }

    // 验证确认密码
    if (!this.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: '确认密码不能为空'
      });
    } else if (this.password !== this.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: '两次输入的密码不一致'
      });
    }

    // 验证验证码
    if (!this.captchaId) {
      errors.push({
        field: 'captchaId',
        message: '验证码ID不能为空'
      });
    }

    if (!this.captchaCode) {
      errors.push({
        field: 'captchaCode',
        message: '验证码不能为空'
      });
    }

    // 验证服务条款
    if (!this.agreeTerms) {
      errors.push({
        field: 'agreeTerms',
        message: '请同意服务条款'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 用户更新DTO
 */
class UpdateUserDto {
  constructor(data) {
    this.username = data.username?.trim();
    this.email = data.email?.trim().toLowerCase();
  }

  /**
   * 获取数据
   */
  getData() {
    return {
      username: this.username,
      email: this.email,
    };
  }

  /**
   * 验证更新数据
   */
  validate() {
    const errors = [];

    // 验证用户名（如果提供）
    if (this.username !== undefined) {
      if (!this.username) {
        errors.push({
          field: 'username',
          message: '用户名不能为空'
        });
      } else if (this.username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
        errors.push({
          field: 'username',
          message: `用户名长度不能少于${VALIDATION_RULES.USERNAME.MIN_LENGTH}位`
        });
      } else if (this.username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
        errors.push({
          field: 'username',
          message: `用户名长度不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}位`
        });
      } else if (!VALIDATION_RULES.USERNAME.PATTERN.test(this.username)) {
        errors.push({
          field: 'username',
          message: '用户名只能包含字母、数字和下划线'
        });
      }
    }

    // 验证邮箱（如果提供）
    if (this.email !== undefined) {
      if (!this.email) {
        errors.push({
          field: 'email',
          message: '邮箱不能为空'
        });
      } else if (!ValidationUtils.isEmail(this.email)) {
        errors.push({
          field: 'email',
          message: '邮箱格式无效'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取有效的更新字段
   */
  getUpdateFields() {
    const fields = {};
    
    if (this.username !== undefined) {
      fields.username = this.username;
    }
    if (this.email !== undefined) {
      fields.email = this.email;
    }
    return fields;
  }
}

/**
 * 管理员更新用户DTO
 */
class AdminUpdateUserDto {
  constructor(data) {
    this.username = data.username?.trim();
    this.email = data.email?.trim().toLowerCase();
    this.avatar = data.avatar?.trim();
    this.roles = data.roles;
    this.status = data.status;
  }

  /**
   * 获取数据
   */
  getData() {
    return {
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      roles: this.roles,
      status: this.status
    };
  }

  /**
   * 验证管理员更新数据
   */
  validate() {
    const errors = [];

    // 验证用户名（如果提供）
    if (this.username !== undefined) {
      if (!this.username) {
        errors.push({
          field: 'username',
          message: '用户名不能为空'
        });
      } else if (this.username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
        errors.push({
          field: 'username',
          message: `用户名长度不能少于${VALIDATION_RULES.USERNAME.MIN_LENGTH}位`
        });
      } else if (this.username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
        errors.push({
          field: 'username',
          message: `用户名长度不能超过${VALIDATION_RULES.USERNAME.MAX_LENGTH}位`
        });
      } else if (!VALIDATION_RULES.USERNAME.PATTERN.test(this.username)) {
        errors.push({
          field: 'username',
          message: '用户名只能包含字母、数字和下划线'
        });
      }
    }

    // 验证邮箱（如果提供）
    if (this.email !== undefined) {
      if (!this.email) {
        errors.push({
          field: 'email',
          message: '邮箱不能为空'
        });
      } else if (!ValidationUtils.isEmail(this.email)) {
        errors.push({
          field: 'email',
          message: '邮箱格式无效'
        });
      }
    }

    // 验证头像URL（如果提供）
    if (this.avatar !== undefined && this.avatar && !ValidationUtils.isUrl(this.avatar)) {
      errors.push({
        field: 'avatar',
        message: '头像URL格式无效'
      });
    }

    // 验证角色（如果提供）
    if (this.roles !== undefined) {
      if (!Array.isArray(this.roles)) {
        errors.push({
          field: 'roles',
          message: '角色必须是数组格式'
        });
      } else if (this.roles.length === 0) {
        errors.push({
          field: 'roles',
          message: '角色不能为空'
        });
      } else {
        const validRoles = ['user', 'admin', 'moderator'];
        const invalidRoles = this.roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
          errors.push({
            field: 'roles',
            message: `无效的角色: ${invalidRoles.join(', ')}`
          });
        }
      }
    }

    // 验证状态（如果提供）
    if (this.status !== undefined) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'DELETED'];
      if (!validStatuses.includes(this.status)) {
        errors.push({
          field: 'status',
          message: `无效的状态，有效值: ${validStatuses.join(', ')}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取有效的更新字段
   */
  getUpdateFields() {
    const fields = {};
    
    if (this.username !== undefined) {
      fields.username = this.username;
    }
    if (this.email !== undefined) {
      fields.email = this.email;
    }
    if (this.avatar !== undefined) {
      fields.avatar = this.avatar;
    }
    if (this.roles !== undefined) {
      fields.roles = JSON.stringify(this.roles);
    }
    if (this.status !== undefined) {
      fields.status = this.status;
    }
    
    return fields;
  }
}

/**
 * 修改密码DTO
 */
class ChangePasswordDto {
  constructor(data) {
    this.currentPassword = data.currentPassword;
    this.newPassword = data.newPassword;
    this.confirmPassword = data.confirmPassword;
  }

  /**
   * 获取数据
   */
  getData() {
    return {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };
  }

}

/**
 * 用户响应DTO
 */
class UserResponseDto {
  constructor(user) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.avatar = user.avatar;
    // 处理JSON格式的roles字段
    if (typeof user.roles === 'string') {
      try {
        this.roles = JSON.parse(user.roles);
      } catch (e) {
        this.roles = ['user'];
      }
    } else if (Array.isArray(user.roles)) {
      this.roles = user.roles;
    } else {
      this.roles = ['user'];
    }
    this.status = user.status;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  /**
   * 转换为公开信息（移除敏感数据）
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      avatar: this.avatar,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  /**
   * 转换为个人信息（包含更多详情）
   */
  toProfile() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      roles: this.roles,
      status: this.status,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = {
  LoginDto,
  RegisterDto,
  UpdateUserDto,
  AdminUpdateUserDto,
  ChangePasswordDto,
  UserResponseDto
};