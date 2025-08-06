import { getCurrentUserApi } from "@@/apis/users"
import { setToken as _setToken, getToken, removeToken } from "@@/utils/cache/cookies"
import { pinia } from "@/pinia"
import { resetRouter } from "@/router"
import { routerConfig } from "@/router/config"
import { useSettingsStore } from "./settings"
import { useTagsViewStore } from "./tags-view"

export const useUserStore = defineStore("user", () => {
  const token = ref<string>(getToken() || "")
  const refreshToken = ref<string>("")
  const roles = ref<string[]>([])
  const username = ref<string>("")
  const email = ref<string>("")
  const avatar = ref<string>("")
  const id = ref<number>(0)

  const tagsViewStore = useTagsViewStore()

  const settingsStore = useSettingsStore()

  // 设置 Token
  const setToken = (value: string) => {
    _setToken(value)
    token.value = value
  }

  // 设置刷新令牌
  const setRefreshToken = (value: string) => {
    refreshToken.value = value
  }

  // 设置用户名
  const setUsername = (value: string) => {
    username.value = value
  }

  // 设置邮箱
  const setEmail = (value: string) => {
    email.value = value
  }

  // 设置头像
  const setAvatar = (value: string) => {
    // 如果是相对路径，在开发环境下不需要添加完整URL，因为会走代理
    avatar.value = value
  }

  // 设置用户ID
  const setId = (value: number) => {
    id.value = value
  }

  // 设置角色
  const setRoles = (value: string[]) => {
    roles.value = value
  }

  // 设置用户信息
  const setUserInfo = (userInfo: any) => {
    setId(userInfo.id)
    setUsername(userInfo.username)
    setEmail(userInfo.email || "")
    setAvatar(userInfo.avatar || "")
  }

  // 获取用户详情
  const getInfo = async () => {
    const { data } = await getCurrentUserApi()
    username.value = data.username
    setUserInfo(data)
    // 验证返回的 roles 是否为一个非空数组，否则塞入一个没有任何作用的默认角色，防止路由守卫逻辑进入无限循环
    setRoles(data.roles?.length > 0 ? data.roles : routerConfig.defaultRoles)
  }

  // 模拟角色变化
  const changeRoles = (role: string) => {
    const newToken = `token-${role}`
    token.value = newToken
    _setToken(newToken)
    // 用刷新页面代替重新登录
    location.reload()
  }

  // 登出
  const logout = () => {
    removeToken()
    token.value = ""
    refreshToken.value = ""
    roles.value = []
    username.value = ""
    email.value = ""
    avatar.value = ""
    id.value = 0
    resetRouter()
    resetTagsView()
    console.log("登出成功")
  }

  // 重置 Token
  const resetToken = () => {
    removeToken()
    token.value = ""
    roles.value = []
  }

  // 重置 Visited Views 和 Cached Views
  const resetTagsView = () => {
    if (!settingsStore.cacheTagsView) {
      tagsViewStore.delAllVisitedViews()
      tagsViewStore.delAllCachedViews()
    }
  }

  return {
    token,
    refreshToken,
    roles,
    username,
    email,
    avatar,
    id,
    setToken,
    setRefreshToken,
    setUsername,
    setEmail,
    setAvatar,
    setId,
    setRoles,
    setUserInfo,
    getInfo,
    changeRoles,
    logout,
    resetToken
  }
})

/**
 * @description 在 SPA 应用中可用于在 pinia 实例被激活前使用 store
 * @description 在 SSR 应用中可用于在 setup 外使用 store
 */
export function useUserStoreOutside() {
  return useUserStore(pinia)
}
