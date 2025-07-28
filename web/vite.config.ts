import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia'
      ],
      resolvers: [ElementPlusResolver()],
      // dts: './auto-imports.d.ts', // 明确指定生成路径
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      // dts: './components.d.ts', // 明确指定生成路径
      // directoryAsNamespace: false,  // 指定目录为命名空间
      // globalNamespaces: [],  // 指定全局命名空间
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use '@/assets/styles/variables.scss' as theme;`
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/api')
      }
    }
  }
})
