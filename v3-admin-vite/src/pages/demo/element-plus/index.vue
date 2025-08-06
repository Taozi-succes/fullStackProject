<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import type { AdminUpdateUserRequestData, UserData, UserListRequestData } from "./apis/type"
import { usePagination } from "@@/composables/usePagination"
import { Delete, Download, Edit, Refresh, RefreshRight, Search } from "@element-plus/icons-vue"
import { useUserStore } from "@/pinia/stores/user"
import { adminUpdateUserApi, deleteUserApi, getUserListApi } from "./apis"

defineOptions({
  name: "UserManagement"
})

const userStore = useUserStore()
const loading = ref<boolean>(false)

const { paginationData, handleCurrentChange, handleSizeChange } = usePagination()

// #region 查询用户列表
const tableData = ref<UserData[]>([])
const searchFormRef = useTemplateRef("searchFormRef")

const searchData = reactive({
  search: ""
})

/** 获取用户列表 */
function getUserList() {
  loading.value = true
  const params: UserListRequestData = {
    page: paginationData.currentPage,
    limit: paginationData.pageSize,
    search: searchData.search
  }

  getUserListApi(params)
    .then((response) => {
      if (response.success && response.data) {
        tableData.value = response.data.users
        paginationData.total = response.data.pagination.total
      } else {
        tableData.value = []
      }
    })
    .finally(() => {
      loading.value = false
    })
}

/** 搜索用户 */
function handleSearch() {
  paginationData.currentPage === 1 ? getUserList() : (paginationData.currentPage = 1)
}

/** 重置搜索 */
function resetSearch() {
  searchFormRef.value?.resetFields()
  handleSearch()
}
// #endregion

// #region 编辑用户
const editDialogVisible = ref(false)
const editFormRef = useTemplateRef("editFormRef")
const editLoading = ref(false)

const editFormData = reactive<AdminUpdateUserRequestData>({
  username: "",
  email: "",
  avatar: "",
  roles: [],
  status: ""
})

const currentEditUserId = ref<number>(0)

// 表单验证规则
const editFormRules: FormRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "用户名长度在 3 到 20 个字符", trigger: "blur" },
    { pattern: /^\w+$/, message: "用户名只能包含字母、数字和下划线", trigger: "blur" }
  ],
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" }
  ],
  roles: [
    { required: true, message: "请选择用户角色", trigger: "change" }
  ],
  status: [
    { required: true, message: "请选择用户状态", trigger: "change" }
  ]
}

// 角色选项
const roleOptions = [
  { label: "普通用户", value: "user" },
  { label: "管理员", value: "admin" },
  { label: "版主", value: "moderator" }
]

// 状态选项
const statusOptions = [
  { label: "正常", value: "ACTIVE" },
  { label: "禁用", value: "INACTIVE" },
  { label: "删除", value: "DELETED" }
]

/** 打开编辑对话框 */
function handleEdit(row: UserData) {
  // 检查当前用户是否为管理员
  if (!userStore.roles.includes("admin")) {
    ElMessage.error("权限不足，只有管理员可以编辑用户")
    return
  }

  currentEditUserId.value = row.id
  editFormData.username = row.username
  editFormData.email = row.email
  editFormData.avatar = row.avatar || ""
  editFormData.roles = [...row.roles]
  editFormData.status = row.status
  editDialogVisible.value = true
}

/** 确认编辑用户 */
function confirmEdit() {
  editFormRef.value?.validate((valid) => {
    if (!valid) return

    // 防止管理员修改自己的角色和状态
    if (currentEditUserId.value === userStore.id) {
      const originalUser = tableData.value.find(user => user.id === currentEditUserId.value)
      if (originalUser) {
        if (JSON.stringify(editFormData.roles) !== JSON.stringify(originalUser.roles)) {
          ElMessage.error("不能修改自己的角色")
          return
        }
        if (editFormData.status !== originalUser.status) {
          ElMessage.error("不能修改自己的状态")
          return
        }
      }
    }

    editLoading.value = true
    adminUpdateUserApi(currentEditUserId.value, editFormData)
      .then((response) => {
        if (response.success) {
          ElMessage.success(response.message || "更新用户信息成功")
          editDialogVisible.value = false
          getUserList() // 重新获取用户列表
        } else {
          ElMessage.error(response.message || "更新用户信息失败")
        }
      })
      .catch((error) => {
        console.error("更新用户信息失败:", error)
        ElMessage.error("更新用户信息失败")
      })
      .finally(() => {
        editLoading.value = false
      })
  })
}

/** 取消编辑 */
function cancelEdit() {
  editDialogVisible.value = false
  editFormRef.value?.resetFields()
}
// #endregion

// #region 删除用户
/** 删除用户 */
function handleDelete(row: UserData) {
  // 检查当前用户是否为管理员
  if (!userStore.roles.includes("admin")) {
    ElMessage.error("权限不足，只有管理员可以删除用户")
    return
  }

  // 防止删除自己
  if (row.id === userStore.id) {
    ElMessage.error("不能删除自己的账户")
    return
  }

  ElMessageBox.confirm(
    `确认删除用户：${row.username}？此操作不可恢复。`,
    "删除用户",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
      dangerouslyUseHTMLString: true
    }
  ).then(() => {
    loading.value = true
    deleteUserApi(row.id)
      .then((response) => {
        if (response.success) {
          ElMessage.success(response.message || "删除用户成功")
          getUserList() // 重新获取用户列表
        } else {
          ElMessage.error(response.message || "删除用户失败")
        }
      })
      .catch((error) => {
        console.error("删除用户失败:", error)
        ElMessage.error("删除用户失败")
      })
      .finally(() => {
        loading.value = false
      })
  })
}
// #endregion

/** 格式化角色显示 */
function formatRoles(roles: string[]): string {
  return roles.join(", ")
}

/** 格式化状态显示 */
function getStatusType(status: string): "primary" | "success" | "warning" | "info" | "danger" {
  switch (status) {
    case "ACTIVE":
      return "success"
    case "INACTIVE":
      return "warning"
    case "BANNED":
      return "danger"
    default:
      return "info"
  }
}

/** 格式化状态文本 */
function getStatusText(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "正常"
    case "INACTIVE":
      return "禁用"
    case "BANNED":
      return "封禁"
    case "DELETED":
      return "已删除"
    default:
      return "未知"
  }
}

/** 格式化时间 */
function formatTime(time: string): string {
  return new Date(time).toLocaleString("zh-CN")
}

// 监听分页参数的变化
watch([() => paginationData.currentPage, () => paginationData.pageSize], getUserList, { immediate: true })
</script>

<template>
  <div class="app-container">
    <el-alert
      title="用户管理"
      type="info"
      description="管理系统中的所有用户，包括查看、编辑和删除用户（仅管理员可操作）"
      show-icon
    />

    <!-- 搜索区域 -->
    <el-card v-loading="loading" shadow="never" class="search-wrapper">
      <el-form ref="searchFormRef" :inline="true" :model="searchData">
        <el-form-item prop="search" label="搜索">
          <el-input
            v-model="searchData.search"
            placeholder="请输入用户名或邮箱"
            clearable
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            查询
          </el-button>
          <el-button :icon="Refresh" @click="resetSearch">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card v-loading="loading" shadow="never">
      <div class="toolbar-wrapper">
        <div>
          <el-tag type="info">
            总用户数：{{ paginationData.total }}
          </el-tag>
        </div>
        <div>
          <el-tooltip content="导出用户列表">
            <el-button type="primary" :icon="Download" circle />
          </el-tooltip>
          <el-tooltip content="刷新当前页">
            <el-button type="primary" :icon="RefreshRight" circle @click="getUserList" />
          </el-tooltip>
        </div>
      </div>

      <div class="table-wrapper">
        <el-table :data="tableData" stripe>
          <el-table-column prop="id" label="ID" width="80" align="center" />
          <el-table-column prop="username" label="用户名" align="center" min-width="120" />
          <el-table-column prop="email" label="邮箱" align="center" min-width="180" />
          <el-table-column prop="roles" label="角色" align="center" min-width="120">
            <template #default="scope">
              <el-tag
                v-for="role in scope.row.roles"
                :key="role"
                :type="role === 'admin' ? 'danger' : 'primary'"
                effect="plain"
                size="small"
                style="margin-right: 4px"
              >
                {{ role }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" align="center" width="100">
            <template #default="scope">
              <el-tag
                :type="getStatusType(scope.row.status)"
                effect="plain"
                disable-transitions
              >
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" align="center" min-width="160">
            <template #default="scope">
              {{ formatTime(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginAt" label="最后登录" align="center" min-width="160">
            <template #default="scope">
              {{ scope.row.lastLoginAt ? formatTime(scope.row.lastLoginAt) : '从未登录' }}
            </template>
          </el-table-column>
          <el-table-column
            fixed="right"
            label="操作"
            width="180"
            align="center"
            v-if="userStore.roles.includes('admin')"
          >
            <template #default="scope">
              <el-button
                type="primary"
                text
                bg
                size="small"
                :icon="Edit"
                @click="handleEdit(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                text
                bg
                size="small"
                :icon="Delete"
                @click="handleDelete(scope.row)"
                :disabled="scope.row.id === userStore.id"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pager-wrapper">
        <el-pagination
          background
          :layout="paginationData.layout"
          :page-sizes="paginationData.pageSizes"
          :total="paginationData.total"
          :page-size="paginationData.pageSize"
          :current-page="paginationData.currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 编辑用户对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户信息"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editFormRef"
        :model="editFormData"
        :rules="editFormRules"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="editFormData.username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="editFormData.email"
            placeholder="请输入邮箱地址"
            clearable
          />
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <el-input
            v-model="editFormData.avatar"
            placeholder="请输入头像URL（可选）"
            clearable
          />
        </el-form-item>
        <el-form-item label="角色" prop="roles">
          <el-select
            v-model="editFormData.roles"
            multiple
            placeholder="请选择用户角色"
            style="width: 100%"
            :disabled="currentEditUserId === userStore.id"
          >
            <el-option
              v-for="option in roleOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <div v-if="currentEditUserId === userStore.id" class="form-tip">
            <el-text type="warning" size="small">
              不能修改自己的角色
            </el-text>
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select
            v-model="editFormData.status"
            placeholder="请选择用户状态"
            style="width: 100%"
            :disabled="currentEditUserId === userStore.id"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <div v-if="currentEditUserId === userStore.id" class="form-tip">
            <el-text type="warning" size="small">
              不能修改自己的状态
            </el-text>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelEdit">
            取消
          </el-button>
          <el-button type="primary" :loading="editLoading" @click="confirmEdit">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.el-alert {
  margin-bottom: 20px;
}

.search-wrapper {
  margin-bottom: 20px;
  :deep(.el-card__body) {
    padding-bottom: 2px;
  }
}

.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-wrapper {
  margin-bottom: 20px;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}

.form-tip {
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}
</style>
