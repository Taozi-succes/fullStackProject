export interface UserData {
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
  status: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 最后登录时间 */
  lastLoginAt?: string
}

export interface UserListRequestData {
  /** 当前页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 搜索关键词 */
  search?: string
}

export interface PaginationData {
  /** 当前页码 */
  page: number
  /** 每页数量 */
  limit: number
  /** 总数量 */
  total: number
  /** 总页数 */
  totalPages: number
}

export interface UserListData {
  /** 用户列表 */
  users: UserData[]
  /** 分页信息 */
  pagination: PaginationData
}

export interface DeleteUserRequestData {
  /** 用户ID */
  id: number
}

export interface DeleteUserData {
  /** 被删除的用户信息 */
  user: Pick<UserData, "id" | "username" | "email" | "status">
}

// 新增：管理员更新用户请求数据
export interface AdminUpdateUserRequestData {
  /** 用户名 */
  username?: string
  /** 邮箱 */
  email?: string
  /** 头像 */
  avatar?: string
  /** 角色 */
  roles?: string[]
  /** 状态 */
  status?: string
}

// 新增：管理员更新用户响应数据
export interface AdminUpdateUserData {
  /** 更新后的用户信息 */
  user: UserData
}

export type UserListResponseData = ApiResponseData<UserListData>

export type DeleteUserResponseData = ApiResponseData<DeleteUserData>

// 新增：管理员更新用户响应类型
export type AdminUpdateUserResponseData = ApiResponseData<AdminUpdateUserData>
