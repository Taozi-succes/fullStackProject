#!/bin/bash

# 进入前端项目目录
cd /var/www/express-vue-app/fullStackProject/v3-admin-vite

# 拉取项目
git pull

# 安装依赖（可选）
# npm install

# 执行构建
npm run build

# 设置权限（确保Nginx可访问）
# sudo chown -R www-data:www-data dist
# sudo chmod -R 755 dist

echo "前端部署完成！构建产物目录: /var/www/express-vue-app/fullStackProject/v3-admin-vite/dist"


# 后端类似     注 pm2可以监听文件变化自己运行重启