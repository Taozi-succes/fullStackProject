<script lang="ts" setup>
const VITE_APP_TITLE = import.meta.env.VITE_APP_TITLE
</script>

<template>
  <footer class="layout-footer">
    <div class="content">
      <a href="http://beian.miit.gov.cn/" target="_blank">浙ICP备2025192127号</a>
      <span>
        ©2025 Created by {{ VITE_APP_TITLE }}
      </span>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.layout-footer {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  .content {
    display: flex;
    gap: 10px;
  }
}
</style>
