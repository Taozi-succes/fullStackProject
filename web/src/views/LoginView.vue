<template>
  <div class="login-container">
    <el-card class="login-card" shadow="hover">
      <div class="brand-logo">
        <span>后台管理系统</span>
      </div>
      <el-form :model="form" @submit.prevent="handleLogin" size="small">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width: 100%" native-type="submit"
            >登录</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/user'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})

const handleLogin = async () => {
  const res = await login({ username: form.username, password: form.password })
  if (res.data?.token) {
    localStorage.setItem('token', res.data.token)
    router.push('/')
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  height: 100%;
  background: theme.$main-bg;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 300px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-logo {
  text-align: center;
  margin-bottom: 32px;
  span {
    color: #2c3e50;
  }
}

</style>
