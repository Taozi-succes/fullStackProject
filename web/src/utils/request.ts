import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { BizErrorCode, BizErrorMessage, HttpErrorMessage } from '@/types/request'

// 统一响应结构类型
export interface ApiResponse<T = any> {
  success: boolean
  msg: string
  data: T
}

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

service.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
service.interceptors.response.use(
  (response) => {
    const data = response.data
    if (typeof data === 'object' && data.code !==200) {
      // 业务级 code 错误提示，优先用枚举消息
      let msg = data.msg
      if (typeof data.code === 'number' && BizErrorMessage[data.code as BizErrorCode]) {
        msg = BizErrorMessage[data.code as BizErrorCode]
      }
      ElMessage({ message: msg || '业务请求失败', type: 'error' })
      // return Promise.reject(data)
    }
    return data
  },
  (error) => {
    // http 级响应码错误提示，优先用枚举消息
    let message = '网络错误'
    if (error.response) {
      if (error.response.data && error.response.data.msg) {
        message = error.response.data.msg
      } else {
        const status = error.response.status
        message = HttpErrorMessage[status] || `HTTP ${status}: ${error.response.statusText}`
      }
    } else if (error.message) {
      message = error.message
    }
    ElMessage({ message, type: 'error' })
    return Promise.reject(error)
  },
)

export default function request<T = any>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  return service(config)
}
