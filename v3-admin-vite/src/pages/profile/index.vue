<script lang="ts" setup>
import type { FormInstance, FormRules, UploadProps } from "element-plus"
import type { AvatarHistoryItem, ChangePasswordRequestData, UpdateProfileRequestData } from "./apis/type"
import { Camera, Check, Edit, Lock, User } from "@element-plus/icons-vue"
import { useUserStore } from "@/pinia/stores/user"
import { changePasswordApi, getAvatarHistoryApi, switchToHistoryAvatarApi, updateUserProfileApi, uploadAvatarApi } from "./apis"

defineOptions({
  name: "UserProfile"
})

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const avatarLoading = ref(false)
const passwordLoading = ref(false)

// 表单数据
const formData = ref<UpdateProfileRequestData>({
  username: userStore.username,
  email: userStore.email
})

// 修改密码表单数据
const passwordFormData = ref<ChangePasswordRequestData>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
})

// 表单验证规则
const formRules: FormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "用户名长度在 3 到 20 个字符", trigger: "blur" }
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" }
  ]
}

// 修改密码验证规则
const passwordRules: FormRules = {
  currentPassword: [
    { required: true, message: "请输入当前密码", trigger: "blur" }
  ],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 1, max: 128, message: "密码长度在 3 到 128 个字符", trigger: "blur" },
    {
      pattern: /^(?=.*[a-z])(?=.*\d)[A-Za-z\d@$!%*?&]/,
      message: "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符",
      trigger: "blur"
    }
  ],
  confirmPassword: [
    { required: true, message: "请确认新密码", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordFormData.value.newPassword) {
          callback(new Error("两次输入的密码不一致"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }
  ]
}

const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 控制修改密码对话框显示
const passwordDialogVisible = ref(false)

// 头像上传前的检查
const beforeAvatarUpload: UploadProps["beforeUpload"] = (rawFile) => {
  const isJPGOrPNG = rawFile.type === "image/jpeg" || rawFile.type === "image/png" || rawFile.type === "image/webp"
  const isLt5M = rawFile.size / 1024 / 1024 < 5

  if (!isJPGOrPNG) {
    ElMessage.error("头像只能是 JPG/PNG 格式!")
    return false
  }
  if (!isLt5M) {
    ElMessage.error("头像大小不能超过 5MB!")
    return false
  }
  return true
}

// 头像上传成功
function handleAvatarSuccess(response: any) {
  if (response.success) {
    userStore.setAvatar(response.data.avatarUrl)
    ElMessage.success("头像上传成功")
  } else {
    ElMessage.error(response.message || "头像上传失败")
  }
  avatarLoading.value = false
}

// 头像上传失败
function handleAvatarError() {
  ElMessage.error("头像上传失败")
  avatarLoading.value = false
}

// 头像上传中
function handleAvatarProgress() {
  avatarLoading.value = true
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const response = await updateUserProfileApi(formData.value)
      if (response.success) {
        // 更新用户信息
        userStore.setUsername(formData.value.username)
        userStore.setEmail(formData.value.email)
        ElMessage.success("个人信息更新成功")
      }
    } catch (error) {
      console.error("更新个人信息失败:", error)
      ElMessage.error("更新失败，请稍后重试")
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
function handleReset() {
  formData.value = {
    username: userStore.username,
    email: userStore.email
  }
  formRef.value?.clearValidate()
}

// 打开修改密码对话框
function openPasswordDialog() {
  passwordDialogVisible.value = true
  // 重置表单
  passwordFormData.value = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  }
  nextTick(() => {
    passwordFormRef.value?.clearValidate()
  })
}

// 关闭修改密码对话框
function closePasswordDialog() {
  passwordDialogVisible.value = false
  passwordFormData.value = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  }
}

// 提交修改密码
async function handlePasswordSubmit() {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    passwordLoading.value = true
    try {
      const response = await changePasswordApi(passwordFormData.value)
      if (response.success) {
        ElMessage.success("密码修改成功")
        closePasswordDialog()
        // 可选：提示用户重新登录
        ElMessageBox.confirm(
          "密码修改成功，建议重新登录以确保安全。是否立即登出？",
          "提示",
          {
            confirmButtonText: "立即登出",
            cancelButtonText: "稍后登出",
            type: "warning"
          }
        ).then(() => {
          console.log("用户选择立即登出")
          userStore.logout()
          router.push("/login")
        }).catch(() => {
          // 用户选择稍后登出，不做任何操作
        })
      }
    } catch (error: any) {
      console.error("修改密码失败:", error)
      const errorMessage = error?.response?.data?.message || "修改密码失败，请稍后重试"
      ElMessage.error(errorMessage)
    } finally {
      passwordLoading.value = false
    }
  })
}

// 头像历史相关状态
const avatarHistory = ref<AvatarHistoryItem[]>([])
const showAvatarHistory = ref(false)

// 获取头像历史记录
async function getAvatarHistory() {
  try {
    const response = await getAvatarHistoryApi()
    if (response.success) {
      avatarHistory.value = response.data.history
    }
  } catch (error) {
    console.error("获取头像历史失败:", error)
  }
}

// 切换到历史头像
async function switchToHistoryAvatar(historyId: number) {
  try {
    const response = await switchToHistoryAvatarApi(historyId)
    if (response.success) {
      // 更新用户信息
      userStore.setUserInfo(response.data)
      ElMessage.success("头像切换成功")
      showAvatarHistory.value = false
    }
  } catch (error) {
    console.error("切换头像失败:", error)
    ElMessage.error("切换头像失败")
  }
}

// 显示头像历史
async function handleShowAvatarHistory() {
  await getAvatarHistory()
  showAvatarHistory.value = true
}
</script>

<template>
  <div class="app-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>个人信息</span>
        </div>
      </template>

      <div class="profile-content">
        <!-- 头像区域 -->
        <div class="avatar-section">
          <div class="avatar-container">
            <el-avatar
              :src="userStore.avatar"
              :size="120"
              :icon="User"
              class="user-avatar"
            />
            <el-upload
              class="avatar-uploader"
              action="/api/user/avatar"
              :headers="{ Authorization: `Bearer ${userStore.token}` }"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :on-success="handleAvatarSuccess"
              :on-error="handleAvatarError"
              :on-progress="handleAvatarProgress"
            >
              <el-button
                type="primary"
                :icon="Camera"
                :loading="avatarLoading"
                class="upload-btn"
              >
                {{ avatarLoading ? '上传中...' : '更换头像' }}
              </el-button>
            </el-upload>
            <!-- 添加头像历史按钮 -->
            <el-button
              type="info"
              plain
              size="small"
              @click="handleShowAvatarHistory"
              class="history-btn"
            >
              头像历史
            </el-button>
          </div>
        </div>

        <!-- 表单区域 -->
        <div class="form-section">
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="80px"
            label-position="left"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="formData.username"
                placeholder="请输入用户名"
                :prefix-icon="User"
                clearable
              />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="formData.email"
                placeholder="请输入邮箱"
                type="email"
                clearable
              />
            </el-form-item>

            <el-form-item label="用户ID">
              <el-input :value="userStore.id" disabled />
            </el-form-item>

            <el-form-item label="角色">
              <el-tag
                v-for="role in userStore.roles"
                :key="role"
                type="info"
                class="role-tag"
              >
                {{ role }}
              </el-tag>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                :icon="Edit"
                @click="handleSubmit"
              >
                {{ loading ? '保存中...' : '保存修改' }}
              </el-button>
              <el-button @click="handleReset">
                重置
              </el-button>
              <el-button
                type="warning"
                :icon="Lock"
                @click="openPasswordDialog"
              >
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-card>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="500px"
      :close-on-click-modal="false"
      @close="closePasswordDialog"
      footer="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordFormData"
        :rules="passwordRules"
        label-width="100px"
        label-position="left"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordFormData.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordFormData.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordFormData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closePasswordDialog">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="passwordLoading"
            @click="handlePasswordSubmit"
          >
            {{ passwordLoading ? '修改中...' : '确认修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 头像历史对话框 -->
    <el-dialog
      v-model="showAvatarHistory"
      title="头像历史"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="avatar-history-container">
        <div class="current-avatar">
          <h4>当前头像</h4>
          <el-avatar
            :size="80"
            :src="userStore.avatar"
            :icon="User"
          />
        </div>

        <el-divider />

        <div class="history-avatars">
          <h4>历史头像</h4>
          <div v-if="avatarHistory.length === 0" class="no-history">
            <el-empty description="暂无历史头像" :image-size="60" />
          </div>
          <div v-else class="history-grid">
            <div
              v-for="item in avatarHistory"
              :key="item.id"
              class="history-item"
              @click="switchToHistoryAvatar(item.id)"
            >
              <el-avatar
                :size="60"
                :src="item.avatarUrl"
                :icon="User"
                class="history-avatar"
              />
              <div class="history-info">
                <span class="history-date">
                  {{ new Date(item.createdAt).toLocaleDateString() }}
                </span>
              </div>
              <div class="history-overlay">
                <el-icon><Check /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showAvatarHistory = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.profile-card {
  max-width: 800px;
  margin: 0 auto;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
  }
}

.profile-content {
  display: flex;
  gap: 40px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
}

.avatar-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  .avatar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .user-avatar {
      border: 3px solid var(--el-border-color-light);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .upload-btn {
      border-radius: 20px;
    }

    .history-btn {
      border-radius: 15px;
      font-size: 12px;
    }
  }
}

.form-section {
  flex: 1;
  min-width: 0;

  .el-form {
    max-width: 400px;
  }

  .role-tag {
    margin-right: 8px;
    margin-bottom: 4px;
  }
}

.dialog-footer {
  text-align: center;
}

.avatar-history-container {
  .current-avatar {
    text-align: center;

    h4 {
      margin-bottom: 16px;
      color: var(--el-text-color-primary);
    }
  }

  .history-avatars {
    h4 {
      margin-bottom: 16px;
      color: var(--el-text-color-primary);
    }

    .no-history {
      text-align: center;
      padding: 20px;
    }

    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 16px;
    }

    .history-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        .history-overlay {
          opacity: 1;
        }
      }

      .history-avatar {
        margin-bottom: 8px;
      }

      .history-info {
        text-align: center;

        .history-date {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }

      .history-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(64, 158, 255, 0.8);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;

        .el-icon {
          color: white;
          font-size: 20px;
        }
      }
    }
  }
}
</style>
