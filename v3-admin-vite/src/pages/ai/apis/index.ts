import { getToken } from "@@/utils/cache/cookies"

export async function* streamRequest(url: string, data: any) {
  const token = getToken()
  const baseURL = import.meta.env.VITE_BASE_URL
  const fullURL = `${baseURL}${url}`

  const response = await fetch(fullURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  if (!response.body) {
    throw new Error("Response body is null")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          if (line.slice(6) !== "[DONE]") {
            const data = JSON.parse(line.slice(6))
            yield data
          } else {
            // 处理完成消息
            yield { done: true }
          }
        } catch (e) {
          console.error("解析失败:", e)
        }
      }
    }
  }
}
