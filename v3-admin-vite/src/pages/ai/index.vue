<script setup lang="ts">
import { marked } from "marked"
import { nextTick, ref } from "vue"
import { streamRequest } from "@/pages/ai/apis"

interface Message {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  timestamp: string
}

const messages = ref<Message[]>([
  {
    role: "assistant",
    content: "你好！我是AI助手，有什么可以帮助你的吗？",
    timestamp: new Date().toLocaleTimeString()
  }
])

const inputMessage = ref("")
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()

// 滚动到最新消息
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function renderMarkdown(content: string) {
  return marked.parse(content)
}

// 发送消息（SSE流式传输）
// 修改sendMessage函数中的SSE处理部分
async function sendMessage() {
  if (!inputMessage.value.trim()) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ""

  // 添加用户消息
  messages.value.push({
    role: "user",
    content: userMessage,
    timestamp: new Date().toLocaleTimeString()
  })

  isLoading.value = true
  scrollToBottom()

  try {
    const stream = streamRequest("/ai/stream", {
      messages: messages.value.map(m => ({ role: m.role, content: m.content }))
    })

    const aiMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true
    }
    messages.value.push(aiMessage as Message)

    for await (const chunk of stream) {
      console.log("收到数据:", chunk)
      if (chunk.content && !chunk.done) {
        messages.value[messages.value.length - 1].content += chunk.content
        scrollToBottom()
        // 立即更新UI
        await nextTick()
      } else {
        messages.value[messages.value.length - 1].isStreaming = false
        scrollToBottom()
      }
    }
    isLoading.value = false
  } catch (error) {
    console.error("AI请求失败:", error)
  }
}
</script>

<template>
  <div class="ai-chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message" :class="[message.role]"
      >
        <div class="message-content">
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-text">
            <div v-if="message.role === 'assistant' && message.isStreaming">
              <span v-html="renderMarkdown(message.content)" />
              <span class="typing-indicator">▋</span>
            </div>
            <div v-else>
              <span v-html="renderMarkdown(message.content)" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading">
        <i class="el-icon-loading" />
        AI正在思考中...
      </div>
    </div>

    <div class="chat-input">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="2"
        placeholder="请输入你的问题..."
        @keyup.enter="sendMessage"
        :disabled="isLoading"
      />
      <el-button
        type="primary"
        @click="sendMessage"
        :loading="isLoading"
        :disabled="!inputMessage.trim()"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "@@/assets/styles/mixins.scss";

.ai-chat-container {
  height: calc(100% - 50px);
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  @extend %scrollbar;
}

.message {
  margin-bottom: 20px;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  line-height: 1.6;
  // 下面所有孙子元素的p元素margin 为0
  p {
    margin: 0;
  }
}

.message.user .message-content {
  flex-direction: row-reverse;
}

.message.user .message-text {
  background: #409eff;
  color: white;
}

.typing-indicator {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.loading {
  text-align: center;
  color: #666;
  padding: 20px;
}

.chat-input {
  padding: 20px;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
</style>
