<template>
  <el-header class="header">
    <el-page-header @back="goBack">
      <template #content>
        <span class="text-large font-600 mr-3"> {{ routeMetaTitle }} </span>
      </template>
    </el-page-header>
    <div>
      <span style="margin-right: 20px">欢迎您, {{ username }}</span>
      <el-button type="primary" size="small" @click="logout">退出登录</el-button>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo } from '@/api/user'

interface Props {
  title?: string
  showLogout?: boolean
}

// 定义组件的 emits 类型
interface Emits {
  logout: []
  userLoaded: [username: string]
}

// 使用 defineProps 和 defineEmits 获得类型提示
const props = withDefaults(defineProps<Props>(), {
  showLogout: true,
})

const emit = defineEmits<Emits>()

const username = ref('管理员')
const router = useRouter()
const route = useRoute()

// 获取路由 meta 里的 title
const routeMetaTitle = computed(() => route.meta.title as string | undefined)
console.log(route.meta)


// 定义暴露给父组件的方法类型
interface ExposedMethods {
  refreshUserInfo: () => Promise<void>
  getCurrentUser: () => string
}


const refreshUserInfo = async () => {
  const token = localStorage.getItem('token')
  if (token) {
    const user = await getUserInfo()
    if (user.success && user.data && user.data.username) {
      username.value = user.data.username
      emit('userLoaded', user.data.username)
    }
  }
}

const getCurrentUser = () => {
  return username.value
}

const goBack = () => {
  console.log('go back')
}

const logout = () => {
  localStorage.removeItem('token')
  emit('logout')
  router.push('/login')
}

onMounted(async () => {
  await refreshUserInfo()
})

// 使用 defineExpose 暴露方法给父组件，获得类型提示
defineExpose<ExposedMethods>({
  refreshUserInfo,
  getCurrentUser,
})
</script>

<style scoped lang="scss">
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
