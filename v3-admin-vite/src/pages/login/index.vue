<script lang="ts" setup>
import type { FormRules } from "element-plus"
import type { LoginRequestData } from "./apis/type"
import ThemeSwitch from "@@/components/ThemeSwitch/index.vue"
import { Key, Loading, Lock, Picture, User } from "@element-plus/icons-vue"
import { Footer } from "@/layouts/components/index"
import { useSettingsStore } from "@/pinia/stores/settings"
import { useUserStore } from "@/pinia/stores/user"
import { getCaptchaApi, loginApi } from "./apis"
import Owl from "./components/Owl.vue"
import { useFocus } from "./composables/useFocus"

const router = useRouter()

const userStore = useUserStore()

const settingsStore = useSettingsStore()

const { isFocus, handleBlur, handleFocus } = useFocus()

/** 登录表单元素的引用 */
const loginFormRef = useTemplateRef("loginFormRef")

/** 登录按钮 Loading */
const loading = ref(false)

/** 验证码图片 URL */
const codeUrl = ref("")
/** 验证码ID */
const captchaId = ref("")

/** 登录表单数据 */
const loginFormData: LoginRequestData = reactive({
  username: "admin",
  password: "abc123",
  captchaId: "",
  captchaCode: ""
})

/** 登录表单校验规则 */
const loginFormRules: FormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 3, max: 16, message: "长度在 3 到 16 个字符", trigger: "blur" }
  ],
  captchaCode: [
    { required: true, message: "请输入验证码", trigger: "blur" }
  ]
}

/** 登录 */
function handleLogin() {
  loginFormRef.value?.validate((valid) => {
    if (!valid) {
      ElMessage.error("表单校验不通过")
      return
    }
    loading.value = true
    loginApi(loginFormData).then((response) => {
      // 后端返回的数据结构：{ success: true, data: { user: {...}, tokens: { accessToken: "...", refreshToken: "..." } } }
      if (response.success && response.data && response.data.tokens) {
        // 先清空之前的用户状态，确保路由守卫重新生成动态路由
        userStore.setRoles([])
        // 设置访问令牌和刷新令牌
        userStore.setToken(response.data.tokens.accessToken)
        userStore.setRefreshToken(response.data.tokens.refreshToken)
        // 设置用户信息
        if (response.data.user) {
          userStore.setUserInfo(response.data.user)
        }
        ElMessage.success(response.message || "登录成功")
        router.push("/")
      } else {
        ElMessage.error(response.message || "登录失败")
        createCode()
        loginFormData.password = ""
      }
    }).catch((error) => {
      console.error("登录失败:", error)
      createCode()
      loginFormData.password = ""
    }).finally(() => {
      loading.value = false
    })
  })
}

/** 创建验证码 */
function createCode() {
  // 清空已输入的验证码
  loginFormData.captchaCode = ""
  // 清空验证图片
  codeUrl.value = ""
  captchaId.value = ""
  // 获取验证码图片
  getCaptchaApi().then((res) => {
    const captchaData = res.data
    // 将SVG字符串转换为Data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(captchaData.captchaSvg)}`
    codeUrl.value = svgDataUrl
    captchaId.value = captchaData.captchaId
    loginFormData.captchaId = captchaData.captchaId
  })
}

/** 前往注册页面 */
function goToRegister() {
  router.push("/register")
}

// 初始化验证码
createCode()
</script>

<template>
  <div class="login-container">
    <ThemeSwitch v-if="settingsStore.showThemeSwitch" class="theme-switch" />
    <Owl :close-eyes="isFocus" />
    <div class="login-card">
      <div class="title">
        <img src="@@/assets/images/layouts/logo-text-2.png">
      </div>
      <div class="content">
        <el-form ref="loginFormRef" :model="loginFormData" :rules="loginFormRules" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model.trim="loginFormData.username"
              placeholder="用户名"
              type="text"
              tabindex="1"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model.trim="loginFormData.password"
              placeholder="密码"
              type="password"
              tabindex="2"
              :prefix-icon="Lock"
              size="large"
              show-password
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-form-item prop="captchaCode">
            <el-input
              v-model.trim="loginFormData.captchaCode"
              placeholder="验证码"
              type="text"
              tabindex="3"
              :prefix-icon="Key"
              maxlength="7"
              size="large"
              @blur="handleBlur"
              @focus="handleFocus"
            >
              <template #append>
                <el-image :src="codeUrl" draggable="false" @click="createCode">
                  <template #placeholder>
                    <el-icon>
                      <Picture />
                    </el-icon>
                  </template>
                  <template #error>
                    <el-icon>
                      <Loading />
                    </el-icon>
                  </template>
                </el-image>
              </template>
            </el-input>
          </el-form-item>
          <el-button :loading="loading" type="primary" size="large" @click.prevent="handleLogin">
            登 录
          </el-button>
          <div class="register-link">
            <span>还没有账号？</span>
            <el-link type="primary" @click="goToRegister">
              立即注册
            </el-link>
          </div>
        </el-form>
      </div>
    </div>
    <div class="footer">
      <Footer />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100%;
  .theme-switch {
    position: fixed;
    top: 5%;
    right: 5%;
    cursor: pointer;
  }
  .login-card {
    width: 480px;
    max-width: 90%;
    border-radius: 20px;
    box-shadow: 0 0 10px #dcdfe6;
    background-color: var(--el-bg-color);
    overflow: hidden;
    .title {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 150px;
      img {
        height: 100%;
      }
    }
    .content {
      padding: 20px 50px 50px 50px;
      :deep(.el-input-group__append) {
        padding: 0;
        overflow: hidden;
        .el-image {
          width: 100px;
          height: 40px;
          border-left: 0px;
          user-select: none;
          cursor: pointer;
          text-align: center;
        }
      }
      .el-button {
        width: 100%;
        margin-top: 10px;
      }
      .register-link {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        font-size: 14px;
        span {
          color: var(--el-text-color-regular);
          margin-right: 8px;
        }
      }
    }
  }
  .footer {
    position: fixed;
    bottom: 0;
  }
}
</style>
