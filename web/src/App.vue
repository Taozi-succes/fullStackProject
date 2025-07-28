
<template>
  <div id="app">
    <MainLayout v-if="showLayout">
      <RouterView />
    </MainLayout>
    <RouterView v-else />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from './components/MainLayout.vue'

const route = useRoute()

// 不需要主布局的页面
const noLayoutRoutes = ['/login']
const showLayout = computed(() => !noLayoutRoutes.includes(route.path))
</script>


<style scoped lang="scss">
#app {
  width: 100%;
  height: 100vh;
}
</style>
