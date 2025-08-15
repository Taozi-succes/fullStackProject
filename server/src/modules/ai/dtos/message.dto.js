// 拿到请求消息 验证消息有效性 
const logger = require("../../../core/logger");

class MessageDto {
  constructor(data) {
    this.messages = data.messages;
    this.data = data;
  }

  isValid() {
    logger.debug("验证消息数据:", this.messages);
    // 验证消息格式是否正确
    if (!this.data || !this.messages || !Array.isArray(this.messages) || this.messages.length === 0) {
      logger.warn("消息数据无效: 消息为空或格式错误");
      return false;
    }

    // 验证messages数组中的每个对象是否包含role和content字段
    for (const message of this.messages) {
      if (!message.role || !message.content) {
        logger.warn("消息数据无效: 消息缺少role或content字段", message);
        return false;
      }
      
      // 验证role是否为有效值
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        logger.warn("消息数据无效: 消息role字段值无效", message.role);
        return false;
      }
    }

    return true;
  }

  getData() {
    return this.messages;
  }
}

module.exports = MessageDto;
