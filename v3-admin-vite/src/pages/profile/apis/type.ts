/** 更新个人信息请求数据 */
export interface UpdateProfileRequestData {
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
}

/** 更新个人信息响应数据 */
export interface UpdateProfileData {
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
  /** 更新时间 */
  updatedAt: string
}

export type UpdateProfileResponseData = ApiResponseData<UpdateProfileData>

/** 上传头像响应数据 */
export interface UploadAvatarData {
  /** 头像URL */
  avatarUrl: string
  /** 文件名 */
  filename: string
}

export type UploadAvatarResponseData = ApiResponseData<UploadAvatarData>

/** 修改密码请求数据 */
export interface ChangePasswordRequestData {
  /** 当前密码 */
  currentPassword: string
  /** 新密码 */
  newPassword: string
  /** 确认密码 */
  confirmPassword: string
}

/** 修改密码响应数据 */
export interface ChangePasswordData {
  /** 成功消息 */
  message: string
}

export type ChangePasswordResponseData = ApiResponseData<ChangePasswordData>
