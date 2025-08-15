@echo off
chcp 65001 >nul
echo 启动前后端开发环境...
echo.

cd v3-admin-vite
start /min cmd /k "npm run dev"
echo cd v3-admin-vite npm run dev 前端已启动
cd ..

cd server
start /min cmd /k "npm run dev"
echo cd server npm run dev 后端已启动·
cd ..

echo.
echo 环境启动完成！
echo.
echo 后端地址: "http://localhost:3000"
echo 前端地址: "http://localhost:3333"
echo.
pause