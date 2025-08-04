/**
 * 验证码控制器单例
 * 确保整个应用中只有一个验证码控制器实例
 */
const CaptchaController = require('./captcha.controller');
const logger = require('../../../core/logger');

// 创建单例实例
let captchaControllerInstance = null;

/**
 * 获取验证码控制器单例实例
 * @returns {CaptchaController} 验证码控制器实例
 */
function getCaptchaController() {
  if (!captchaControllerInstance) {
    captchaControllerInstance = new CaptchaController();
    
    // 只在第一次创建时记录日志
    const serviceType = CaptchaController.getServiceType();
    logger.info(`验证码控制器初始化完成，使用${serviceType}`);
  }
  
  return captchaControllerInstance;
}

module.exports = {
  getCaptchaController,
  CaptchaController
};