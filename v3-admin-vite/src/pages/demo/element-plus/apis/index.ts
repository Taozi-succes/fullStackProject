import type * as User from "./type"
import { request } from "@/http/axios"

/** 获取用户列表 */
export function getUserListApi(params: User.UserListRequestData) {
  return request<User.UserListResponseData>({
    url: "/user/list",
    method: "get",
    params
  })
}

/** 删除用户 */
export function deleteUserApi(id: number) {
  return request<User.DeleteUserResponseData>({
    url: `/user/${id}`,
    method: "delete"
  })
}

/** 管理员更新用户信息 */
export function adminUpdateUserApi(id: number, data: User.AdminUpdateUserRequestData) {
  return request<User.AdminUpdateUserResponseData>({
    url: `/admin/user/${id}`,
    method: "put",
    data
  })
}
