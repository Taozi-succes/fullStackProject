export interface LoginRequestData {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 验证码ID */
  captchaId: string
  /** 验证码 */
  captchaCode: string
}

export interface CaptchaData {
  /** 验证码ID */
  captchaId: string
  /** 验证码SVG图片 */
  captchaSvg: string
  /** 过期时间 */
  expiresAt: string
  /** 有效期（秒） */
  expiresIn: number
}

export interface UserInfo {
  /** 用户ID */
  id: number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 头像 */
  avatar?: string
  /** 角色 */
  roles?: string[]
}

export interface TokenInfo {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
  /** 令牌类型 */
  tokenType: string
  /** 过期时间（秒） */
  expiresIn: number
}

export interface LoginData {
  /** 用户信息 */
  user: UserInfo
  /** 令牌信息 */
  tokens: TokenInfo
}

export type CaptchaResponseData = ApiResponseData<CaptchaData>

export type LoginResponseData = ApiResponseData<LoginData>
