<template>
  <el-aside 
    class="sidebar-container" 
    :width="props.collapsed ? '64px' : props.width"
  >
    <div class="header">
      <h1 v-if="!props.collapsed" class="title">管理系统</h1>
      <el-icon v-else class="collapsed-icon"><el-icon-menu /></el-icon>
      <el-icon 
        class="toggle-icon" 
        @click="toggleCollapse"
      >
        <el-icon-arrow-left v-if="props.collapsed" />
        <el-icon-arrow-right v-else />
      </el-icon>
    </div>
    <el-menu 
      default-active="2" 
      class="sidebar-menu" 
      @open="handleOpen" 
      @close="handleClose"
      :collapse="props.collapsed"
    >
      <el-sub-menu index="1">
        <template #title>
          <el-icon><location /></el-icon>
          <span>Navigator One</span>
        </template>
        <el-menu-item-group title="Group One">
          <el-menu-item index="1-1">item one</el-menu-item>
          <el-menu-item index="1-2">item two</el-menu-item>
        </el-menu-item-group>
        <el-menu-item-group title="Group Two">
          <el-menu-item index="1-3">item three</el-menu-item>
        </el-menu-item-group>
        <el-sub-menu index="1-4">
          <template #title>item four</template>
          <el-menu-item index="1-4-1">item one</el-menu-item>
        </el-sub-menu>
      </el-sub-menu>
      <el-menu-item index="2">
        <el-icon><icon-menu /></el-icon>
        <span>Navigator Two</span>
      </el-menu-item>
      <el-menu-item index="3" disabled>
        <el-icon><document /></el-icon>
        <span>Navigator Three</span>
      </el-menu-item>
      <el-menu-item index="4">
        <el-icon><setting /></el-icon>
        <span>Navigator Four</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

// 定义菜单项类型
interface MenuItem {
  index: string
  title: string
  icon: string
}

// 定义组件的 props 类型
interface Props {
  collapsed?: boolean
  width?: string
  menuItems?: MenuItem[]
}

// 定义组件的 emits 类型
interface Emits {
  menuSelect: [index: string, indexPath: string[]]
  collapse: [collapsed: boolean]
}

// 使用 defineProps 和 defineEmits 获得类型提示
const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  width: '200px',
  menuItems: () => [
    { index: '/home', title: '首页', icon: 'el-icon-house' },
    { index: '/users', title: '用户管理', icon: 'el-icon-user' },
    { index: '/settings', title: '系统设置', icon: 'el-icon-setting' },
  ],
})

const emit = defineEmits<Emits>()

const route = useRoute()

const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const toggleCollapse = () => {
  emit('collapse', !props.collapsed)
}

// 使用 defineExpose 暴露方法给父组件，获得类型提示
defineExpose({
  toggleCollapse,
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.sidebar-container {
  height: 100%;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.collapsed-icon {
  font-size: 24px;
}

.toggle-icon {
  cursor: pointer;
  font-size: 20px;
}

.sidebar-menu {
  width: 100%;
  flex: 1;
  background-color: transparent;
}


</style>