#!/bin/bash
cd v3-admin-vite
npm run build
sudo cp -r dist/* /var/www/html/
echo "前端部署完成！"
