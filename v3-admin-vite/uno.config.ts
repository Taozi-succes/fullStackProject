import {
  defineConfig,
  presetAttributify,
  presetWind3,
  transformerDirectives
} from "unocss"

export default defineConfig({
  // 预设
  presets: [
    // 属性化模式 & 无值的属性模式
    presetAttributify({
      prefix: "un-",
      prefixedOnly: false
    }),
    // 默认预设
    presetWind3({
      important: "#app"
    })
  ],
  // 自定义规则
  rules: [],
  // 自定义快捷方式
  shortcuts: {
    "wh-full": "w-full h-full",
    "flex-center": "flex justify-center items-center",
    "flex-x-center": "flex justify-center",
    "flex-y-center": "flex items-center"
  },
  transformers: [transformerDirectives()] // 指令转换器  用于在style标签中使用指令@apply 等指令
})
