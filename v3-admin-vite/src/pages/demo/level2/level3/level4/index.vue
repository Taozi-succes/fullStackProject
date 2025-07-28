<script lang="ts" setup>
defineOptions({
  name: "Level4"
})

const text = ref("")
</script>

<template>
  <div class="app-container">
    <el-card header="4级路由">
      <el-input v-model="text" placeholder="输入任意字符测试缓存" />
    </el-card>
  </div>
</template>
