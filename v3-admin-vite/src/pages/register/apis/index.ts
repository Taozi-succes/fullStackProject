import type * as Register from "./type"
import type * as Auth from "@/pages/login/apis/type"
import { request } from "@/http/axios"

/** 获取注册验证码 */
export function getCaptchaApi() {
  return request<Auth.CaptchaResponseData>({
    url: "/captcha/generate",
    method: "get"
  })
}

/** 用户注册 */
export function registerApi(data: Register.RegisterRequestData) {
  return request<Register.RegisterResponseData>({
    url: "/auth/register",
    method: "post",
    data
  })
}

/** 检查用户名是否可用 */
export function checkUsernameApi(username: string) {
  return request<ApiResponseData<{ available: boolean }>>({
    url: "/auth/check-username",
    method: "get",
    params: { username }
  })
}

/** 检查邮箱是否可用 */
export function checkEmailApi(email: string) {
  return request<ApiResponseData<{ available: boolean }>>({
    url: "/auth/check-email",
    method: "get",
    params: { email }
  })
}