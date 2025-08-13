<template>
  <div pa-20px h-full text-center flex select-none all:transition-400>
    <div ma>
      <div text-5xl fw100 animate-bounce-alt animate-count-infinite animate-duration-1s>
        UnoCSS
      </div>
      <div op30 text-lg fw300 m1 dark:op60>
        该页面是一个 UnoCSS 的使用案例，其他页面依旧采用 Scss
      </div>
      <div m2 flex-x-center text-lg op30 hover="op50" dark:op60 dark:hover="op30">
        <a href="https://antfu.me/posts/reimagine-atomic-css-zh" target="_blank">
          推荐阅读：重新构想原子化 CSS
        </a>
      </div>

      <div class="footer mt-30px">
        底部文字
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.footer {
  @apply text-sm op30 dark:op90 hover:op50 dark:hover:op30 transition-400;
}
</style>
