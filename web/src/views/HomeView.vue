<template>
  <main>
    <div v-if="username">
      <h1>欢迎您, {{ username }}</h1>
      <button @click="logout">退出登录</button>
    </div>
    <div v-else>
      首页
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserInfo } from '@/api/user'


const username = ref('')
const router = useRouter()

onMounted(async () => {
    const user = await getUserInfo()
    username.value = user.data.username
})

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>
