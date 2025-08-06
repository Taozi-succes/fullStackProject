export interface CurrentUserData {
  /** 用户ID */
  id: number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 头像 */
  avatar?: string
  /** 角色 */
  roles: string[]
  /** 状态 */
  status: number
}

export type CurrentUserResponseData = ApiResponseData<CurrentUserData>
