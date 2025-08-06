import type * as Profile from "./type"
import { request } from "@/http/axios"

/** 更新用户个人信息 */
export function updateUserProfileApi(data: Profile.UpdateProfileRequestData) {
  return request<Profile.UpdateProfileResponseData>({
    url: "/user/profile",
    method: "put",
    data
  })
}

/** 上传头像 */
export function uploadAvatarApi(file: File) {
  const formData = new FormData()
  formData.append("avatar", file)

  return request<Profile.UploadAvatarResponseData>({
    url: "/user/avatar",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  })
}

/** 修改密码 */
export function changePasswordApi(data: Profile.ChangePasswordRequestData) {
  return request<Profile.ChangePasswordResponseData>({
    url: "/user/password",
    method: "put",
    data
  })
}

/** 获取头像历史记录 */
export function getAvatarHistoryApi() {
  return request<Profile.GetAvatarHistoryResponseData>({
    url: "/user/avatar/history",
    method: "get"
  })
}

/** 切换到历史头像 */
export function switchToHistoryAvatarApi(historyId: number) {
  return request<Profile.SwitchAvatarResponseData>({
    url: `/user/avatar/switch/${historyId}`,
    method: "put"
  })
}
