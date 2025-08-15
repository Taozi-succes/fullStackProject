const axios = require('axios');
const logger = require("../../../core/logger");
const config = require("../../../core/config");

class AiStreamService {
    #API_KEY = config.get('ai.apiKey');
    #MODEL_NAME = config.get('ai.modelName');

    // 流式发送消息
    sendStreamMessage = async (messages, res) => {
        try {
            // 设置SSE响应头
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
            res.setHeader('X-Accel-Buffering', 'no'); // 禁用代理缓冲

            // 发送初始连接消息
            res.write(`event: connected\n`);
            res.write(`data: ${JSON.stringify({ message: '连接成功' })}\n\n`);

            logger.info(`开始调用百度大模型API: 消息数量: ${messages.length}`);

            // 调用文心一言API，启用流式响应
            const response = await axios.post(
                `https://qianfan.baidubce.com/v2/chat/completions`,
                {
                    model: this.#MODEL_NAME,
                    messages: messages,
                    stream: true,
                    max_tokens: 2048,
                    temperature: 0.8,
                    top_p: 0.8,
                    penalty_score: 1.0
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.#API_KEY}`
                    },
                    responseType: 'stream',
                    timeout: 30000
                }
            );

            let buffer = '';

            // 修改流式处理逻辑
            response.data.on('data', (chunk) => {
              // logger.debug("接收到数据块:", chunk);
                try {
                    buffer += chunk.toString();
                    // logger.debug("当前缓冲区内容:", buffer);
                    // 处理完整的SSE消息
                    const lines = buffer.split('\n');
                    // logger.debug("当前行数据:", lines);
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const data = trimmedLine.slice(6);
                            
                            if (data === '[DONE]') {
                                res.write(`event: done\ndata: [DONE]\n\n`);
                                res.end();
                                logger.info("流式响应完成");
                                return;
                            }
                            
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content || '';
                                
                                if (content) {
                                    logger.info("发送内容片段:", content);
                                    res.write(`event: message\n`);
                                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                                    
                                    // 关键：强制刷新缓冲区
                                    if (res.flush) {
                                        res.flush();
                                    }
                                    
                                    // 可选：添加小延迟让流式效果更明显
                                    // setTimeout(() => {}, 10);
                                }
                            } catch (e) {
                                logger.debug("解析行失败:", line);
                            }
                        }
                    }
                } catch (error) {
                    logger.error("处理数据块错误:", error);
                }
            });

            response.data.on('end', () => {
                if (buffer.trim()) {
                    // 处理最后剩余的数据
                    try {
                        const data = buffer.trim().startsWith('data: ') ? buffer.trim().slice(6) : buffer.trim();
                        if (data !== '[DONE]') {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                res.write(`event: message\n`);
                                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                            }
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
                
                res.write(`event: done\ndata: [DONE]\n\n`);
                res.end();
                logger.info("流式响应结束");
            });

            response.data.on('error', (error) => {
                logger.error("流式响应错误:", error);
                res.write(`event: error\n`);
                res.write(`data: ${JSON.stringify({ error: '流式响应错误: ' + error.message })}\n\n`);
                res.end();
            });

        } catch (error) {
            logger.error("AI流式发送消息服务错误:", error.response?.data || error.message);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    };
}

module.exports = AiStreamService;