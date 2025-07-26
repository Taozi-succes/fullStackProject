<template>
  <div class="login-bg">
    <el-card class="login-card" shadow="hover">
      <div class="brand-logo">
        <span>xx管理系统</span>
      </div>
      <el-form :model="form" @submit.prevent="handleLogin" class="login-form" size="small">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名"  />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" style="width: 100%" native-type="submit"
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
  localStorage.setItem('token', res.data.token)
  router.push('/')
}
</script>

<style lang="scss" scoped>
.login-bg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 320px;
  border-radius: 14px;
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.08);
  background: theme.$card-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: theme.$primary-color;
  margin-bottom: 24px;
  user-select: none;
}
.login-form {
  width: 100%;
  margin-top: 0;
}
.login-btn {
  background: theme.$button-bg;
  letter-spacing: 1px;
  border-radius: 8px;
}
</style>
