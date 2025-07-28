<template>
  <div class="main-layout">
    <el-container class="main-container">
      <Sidebar class="sidebar" :collapsed="isCollapsed"  @collapse="handleCollapse"/>
      <el-container class="content-container" >
        <HeaderBar class="header"/>
        <el-main>
          <slot />
        </el-main>  
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
const isCollapsed = ref(false)

const handleCollapse = (collapsed: boolean) => {
  isCollapsed.value = collapsed
}
</script>

<style scoped>
.main-layout {
  height: 100%;
  .main-container {
    height: 100%;
    .content-container{
      display: flex;
      flex-direction: column;
    }
  }
}
</style>
