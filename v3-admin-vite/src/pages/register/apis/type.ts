export interface RegisterRequestData {
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 密码 */
  password: string
  /** 确认密码 */
  confirmPassword: string
  /** 验证码ID */
  captchaId: string
  /** 验证码 */
  captchaCode: string
}

export interface RegisterData {
  /** 用户信息 */
  user: {
    /** 用户ID */
    id: number
    /** 用户名 */
    username: string
    /** 邮箱 */
    email: string
    /** 头像 */
    avatar?: string
  }
  /** 注册成功消息 */
  message: string
}

export type RegisterResponseData = ApiResponseData<RegisterData>
