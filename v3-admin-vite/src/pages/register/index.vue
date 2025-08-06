<script lang="ts" setup>
import type { FormRules } from "element-plus"
import type { RegisterRequestData } from "./apis/type"
import ThemeSwitch from "@@/components/ThemeSwitch/index.vue"
import { Key, Loading, Lock, Message, Picture, User } from "@element-plus/icons-vue"
import Owl from "@/pages/login/components/Owl.vue"
import { useFocus } from "@/pages/login/composables/useFocus"
import { useSettingsStore } from "@/pinia/stores/settings"
import { checkEmailApi, checkUsernameApi, getCaptchaApi, registerApi } from "./apis"

const router = useRouter()

const settingsStore = useSettingsStore()

const { isFocus, handleBlur, handleFocus } = useFocus()

/** 注册表单元素的引用 */
const registerFormRef = useTemplateRef("registerFormRef")

/** 注册按钮 Loading */
const loading = ref(false)

/** 验证码图片 URL */
const codeUrl = ref("")
/** 验证码ID */
const captchaId = ref("")

/** 注册表单数据 */
const registerFormData: RegisterRequestData = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  captchaId: "",
  captchaCode: "",
  agreeTerms: false
})

/** 自定义验证器：确认密码 */
function validateConfirmPassword(rule: any, value: string, callback: any) {
  if (value === "") {
    callback(new Error("请再次输入密码"))
  } else if (value !== registerFormData.password) {
    callback(new Error("两次输入密码不一致"))
  } else {
    callback()
  }
}

/** 自定义验证器：用户名唯一性 */
function validateUsername(rule: any, value: string, callback: any) {
  if (!value) {
    callback(new Error("请输入用户名"))
    return
  }
  if (value.length < 3 || value.length > 20) {
    callback(new Error("用户名长度在 3 到 20 个字符"))
    return
  }
  if (!/^\w+$/.test(value)) {
    callback(new Error("用户名只能包含字母、数字和下划线"))
    return
  }

  checkUsernameApi(value).then(response => {
    if (response.success && !response.data.available) {
      callback(new Error("用户名已被占用"))
    } else {
      callback()
    }
  }).catch(() => {
    callback()
  })
}

/** 自定义验证器：邮箱唯一性 */
function validateEmail(rule: any, value: string, callback: any) {
  if (!value) {
    callback(new Error("请输入邮箱"))
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    callback(new Error("请输入有效的邮箱地址"))
    return
  }

  checkEmailApi(value).then(response => {
    if (response.success && !response.data.available) {
      callback(new Error("邮箱已被注册"))
    } else {
      callback()
    }
  }).catch(() => {
    callback()
  })
}

/** 注册表单校验规则 */
const registerFormRules: FormRules = {
  username: [
    { validator: validateUsername, trigger: "blur" }
  ],
  email: [
    { validator: validateEmail, trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 3, max: 16, message: "长度在 3到 16 个字符", trigger: "blur" },
    { pattern: /^(?=.*[a-z])(?=.*\d)[a-z\d@$!%*?&]{3,}$/i, message: "密码必须包含大小写字母和数字", trigger: "blur" }
    // { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, message: "密码必须包含大小写字母和数字", trigger: "blur" }
  ],
  confirmPassword: [
    { validator: validateConfirmPassword, trigger: "blur" }
  ],
  captchaCode: [
    { required: true, message: "请输入验证码", trigger: "blur" }
  ],
  agreeTerms: [
    {
      validator: (rule: any, value: boolean, callback: any) => {
        if (!value) {
          callback(new Error("请同意服务条款和隐私政策"))
        } else {
          callback()
        }
      },
      trigger: "change"
    }
  ]
}

/** 注册 */
function handleRegister() {
  registerFormRef.value?.validate((valid) => {
    if (!valid) {
      ElMessage.error("表单校验不通过")
      return
    }
    loading.value = true
    registerApi(registerFormData).then((response) => {
      if (response.success) {
        ElMessage.success(response.message || "注册成功")
        ElMessageBox.confirm(
          "注册成功！是否立即前往登录页面？",
          "注册成功",
          {
            confirmButtonText: "去登录",
            cancelButtonText: "稍后",
            type: "success"
          }
        ).then(() => {
          router.push("/login")
        }).catch(() => {
          // 用户选择稍后
        })
      } else {
        ElMessage.error(response.message || "注册失败")
        createCode()
        registerFormData.captchaCode = ""
      }
    }).catch((error) => {
      console.error("注册失败:", error)
      ElMessage.error("注册失败，请稍后重试")
      createCode()
      registerFormData.captchaCode = ""
    }).finally(() => {
      loading.value = false
    })
  })
}

/** 创建验证码 */
function createCode() {
  // 清空已输入的验证码
  registerFormData.captchaCode = ""
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
    registerFormData.captchaId = captchaData.captchaId
  })
}

/** 前往登录页面 */
function goToLogin() {
  router.push("/login")
}

/** 显示服务条款对话框 */
function showTermsDialog() {
  ElMessageBox.alert(
    `<div style="text-align: left; line-height: 1.6;">
      <h3>服务条款</h3>
      <p>1. 用户注册时必须提供真实、准确的个人信息。</p>
      <p>2. 用户应妥善保管账号密码，不得将账号借给他人使用。</p>
      <p>3. 禁止发布违法、有害、虚假或不当内容。</p>
      <p>4. 我们保留在必要时暂停或终止用户账号的权利。</p>
      <p>5. 用户使用本服务即表示同意遵守相关法律法规。</p>
      <p>6. 本条款的解释权归本平台所有。</p>
    </div>`,
    "服务条款",
    {
      confirmButtonText: "我已了解",
      dangerouslyUseHTMLString: true,
      customStyle: {
        width: "500px"
      }
    }
  )
}

/** 显示隐私政策对话框 */
function showPrivacyDialog() {
  ElMessageBox.alert(
    `<div style="text-align: left; line-height: 1.6;">
      <h3>隐私政策</h3>
      <p>1. 我们重视您的隐私保护，仅收集必要的个人信息。</p>
      <p>2. 您的个人信息将用于账号管理和服务提供。</p>
      <p>3. 我们采用安全措施保护您的个人信息不被泄露。</p>
      <p>4. 未经您同意，我们不会向第三方提供您的个人信息。</p>
      <p>5. 您有权查询、更正或删除您的个人信息。</p>
      <p>6. 如有隐私相关问题，请联系我们的客服。</p>
    </div>`,
    "隐私政策",
    {
      confirmButtonText: "我已了解",
      dangerouslyUseHTMLString: true,
      customStyle: {
        width: "500px"
      }
    }
  )
}

// 初始化验证码
createCode()
</script>

<template>
  <div class="register-container">
    <ThemeSwitch v-if="settingsStore.showThemeSwitch" class="theme-switch" />
    <Owl :close-eyes="isFocus" />
    <div class="register-card">
      <div class="title">
        <img src="@@/assets/images/layouts/logo-text-2.png">
        <h2>用户注册</h2>
      </div>
      <div class="content">
        <el-form ref="registerFormRef" :model="registerFormData" :rules="registerFormRules" @keyup.enter="handleRegister">
          <el-form-item prop="username">
            <el-input
              v-model.trim="registerFormData.username"
              placeholder="用户名（3-20个字符，仅支持字母、数字、下划线）"
              type="text"
              tabindex="1"
              :prefix-icon="User"
              size="large"
              clearable
            />
          </el-form-item>
          <el-form-item prop="email">
            <el-input
              v-model.trim="registerFormData.email"
              placeholder="邮箱地址"
              type="email"
              tabindex="2"
              :prefix-icon="Message"
              size="large"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model.trim="registerFormData.password"
              placeholder="密码（8-16位，包含大小写字母和数字）"
              type="password"
              tabindex="3"
              :prefix-icon="Lock"
              size="large"
              show-password
              clearable
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model.trim="registerFormData.confirmPassword"
              placeholder="确认密码"
              type="password"
              tabindex="4"
              :prefix-icon="Lock"
              size="large"
              show-password
              clearable
              @blur="handleBlur"
              @focus="handleFocus"
            />
          </el-form-item>
          <el-form-item prop="captchaCode">
            <el-input
              v-model.trim="registerFormData.captchaCode"
              placeholder="验证码"
              type="text"
              tabindex="5"
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
          <el-form-item prop="agreeTerms">
            <el-checkbox v-model="registerFormData.agreeTerms" size="large">
              我已阅读并同意
              <el-link type="primary" @click="showTermsDialog">
                《服务条款》
              </el-link>
              和
              <el-link type="primary" @click="showPrivacyDialog">
                《隐私政策》
              </el-link>
            </el-checkbox>
          </el-form-item>
          <el-button :loading="loading" type="primary" size="large" @click.prevent="handleRegister">
            注 册
          </el-button>
          <div class="login-link">
            <span>已有账号？</span>
            <el-link type="primary" @click="goToLogin">
              立即登录
            </el-link>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.register-container {
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
  .register-card {
    width: 520px;
    max-width: 90%;
    border-radius: 20px;
    box-shadow: 0 0 10px #dcdfe6;
    background-color: var(--el-bg-color);
    overflow: hidden;
    .title {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 150px;
      img {
        height: 64px;
      }
      h2 {
        margin: 16px 0 0 0;
        color: var(--el-text-color-primary);
        font-weight: 500;
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
      .login-link {
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
}

.dark .register-container {
  .register-card {
    box-shadow: 0 0 10px #000000;
  }
}
</style>
