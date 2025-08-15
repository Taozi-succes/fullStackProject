const AiStreamService = require('../services/ai.stream.service');
const MessageDto = require("../dtos/message.dto");
const logger = require("../../../core/logger");

class AiStreamController {
    constructor() {
        this.aiStreamService = new AiStreamService();
    }

    // SSE流式消息处理
    streamMessage = async (req, res) => {
        try {
            // 数据验证
            const messageDto = new MessageDto(req.body);

            if (!messageDto.isValid()) {
                res.status(400).json({
                    success: false,
                    message: "请求数据无效",
                });
                return;
            }

            // 调用流式服务
            await this.aiStreamService.sendStreamMessage(
                messageDto.getData(),
                res
            );

        } catch (error) {
            logger.error("AI流式控制器错误:", error);
            res.status(500).json({
                success: false,
                message: "服务器内部错误",
            });
        }
    };
}

module.exports = AiStreamController;