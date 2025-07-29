# Express Enterprise Server

企业级Express服务器，采用模块化架构设计，提供高可维护性、高性能和高安全性的后端解决方案。

## 🏗️ 项目架构

```
src/
├── common/                 # 公共模块
│   ├── constants/          # 常量定义
│   ├── enums/             # 枚举定义
│   ├── interfaces/        # 接口定义
│   └── types/             # 类型定义
├── core/                  # 核心模块
│   ├── config/            # 配置管理
│   ├── database/          # 数据库连接
│   └── logger/            # 日志系统
├── modules/               # 业务模块
│   ├── auth/              # 认证模块
│   ├── user/              # 用户模块
│   └── captcha/           # 验证码模块
├── shared/                # 共享模块
│   ├── utils/             # 工具函数
│   ├── helpers/           # 助手函数
│   └── validators/        # 验证器
├── routes/                # 路由定义
└── app.js                 # 应用主文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0 (可选，用于验证码存储)
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 配置数据库连接和其他环境变量：
```env
# 数据库配置
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# 服务器配置
PORT=3000
NODE_ENV="development"

# 验证码配置
CAPTCHA_LENGTH=4
CAPTCHA_WIDTH=120
CAPTCHA_HEIGHT=40

# 验证码存储配置
CAPTCHA_USE_REDIS=false  # 设置为true使用Redis存储

# Redis配置（当CAPTCHA_USE_REDIS=true时生效）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=express_app:

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
```

### 数据库设置

1. 生成Prisma客户端：
```bash
npm run db:generate
```

2. 推送数据库模式：
```bash
npm run db:push
```

3. （可选）运行数据库迁移：
```bash
npm run db:migrate
```

### Redis设置（可选）

如果要使用Redis存储验证码，请确保Redis服务正在运行：

1. 安装Redis（Windows）：
```bash
# 使用Chocolatey
choco install redis-64

# 或下载Windows版本
# https://github.com/microsoftarchive/redis/releases
```

2. 启动Redis服务：
```bash
redis-server
```

3. 在.env文件中启用Redis：
```env
CAPTCHA_USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 启动服务器

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

## 📚 API 文档

### 基础信息

- **基础URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

### 认证接口

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "Password123!"
}
```

#### 刷新令牌
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### 用户接口

#### 获取用户信息
```http
GET /api/user/profile
Authorization: Bearer your-access-token
```

#### 更新用户信息
```http
PUT /api/user/profile
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

#### 修改密码
```http
PUT /api/user/password
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

### 验证码接口

#### 生成验证码
```http
GET /api/captcha/generate?type=text
```

支持的验证码类型：
- `text`: 文本验证码（默认）
- `math`: 数学运算验证码
- `numeric`: 纯数字验证码

#### 验证验证码
```http
POST /api/captcha/verify
Content-Type: application/json

{
  "captcha": "ABCD",
  "captchaId": "uuid-string"
}
```

#### 刷新验证码
```http
POST /api/captcha/refresh
Content-Type: application/json

{
  "captchaId": "uuid-string",
  "type": "text"
}
```

#### 验证码存储方式

系统支持两种验证码存储方式：

1. **内存存储**（默认）：
   - 验证码存储在服务器内存中
   - 适用于单实例部署
   - 服务器重启后验证码会丢失

2. **Redis存储**：
   - 验证码存储在Redis中
   - 支持分布式部署
   - 服务器重启后验证码仍然有效
   - 可配置过期时间和清理策略

切换存储方式：
```env
# 使用Redis存储
CAPTCHA_USE_REDIS=true

# 使用内存存储
CAPTCHA_USE_REDIS=false
```

## 🔧 核心功能

### 安全特性

- **JWT认证**: 基于JSON Web Token的无状态认证
- **密码加密**: 使用bcrypt进行密码哈希
- **请求限流**: 防止API滥用和暴力攻击
- **CORS配置**: 跨域资源共享安全配置
- **Helmet安全**: HTTP头安全防护
- **输入验证**: 严格的请求参数验证

### 性能优化

- **响应压缩**: Gzip压缩减少传输大小
- **连接池**: 数据库连接池管理
- **缓存机制**: 内存缓存和Redis缓存提升响应速度
- **分布式存储**: Redis支持多实例部署
- **优雅关闭**: 服务器优雅关闭处理
- **连接复用**: Redis连接池和懒加载连接

### 日志系统

- **分级日志**: ERROR, WARN, INFO, DEBUG四个级别
- **文件输出**: 按日期和类型分类存储
- **控制台输出**: 开发环境彩色日志
- **请求日志**: HTTP请求详细记录

### 数据验证

- **DTO模式**: 数据传输对象验证
- **Joi验证**: 强大的数据验证库
- **Express-validator**: 中间件级别验证
- **自定义验证器**: 业务逻辑验证

## 🛠️ 开发工具

### 数据库管理

```bash
# 查看数据库
npm run db:studio

# 生成客户端
npm run db:generate

# 推送模式
npm run db:push

# 运行迁移
npm run db:migrate
```

### 代码质量

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# 运行测试
npm test
```

## 📁 目录说明

### `/src/common`
存放项目公共资源，包括常量、枚举、接口和类型定义。

### `/src/core`
核心基础设施，包括配置管理、数据库连接和日志系统。

### `/src/modules`
业务模块，每个模块包含控制器、服务和DTO。

### `/src/shared`
共享工具和助手函数，可在整个项目中复用。

### `/src/routes`
路由定义，按功能模块组织。

## 🔒 安全最佳实践

1. **环境变量**: 敏感信息存储在环境变量中
2. **密码策略**: 强制复杂密码要求
3. **令牌管理**: JWT令牌安全生成和验证
4. **请求限流**: 防止API滥用
5. **输入验证**: 严格验证所有输入数据
6. **错误处理**: 不泄露敏感错误信息
7. **HTTPS**: 生产环境强制使用HTTPS
8. **安全头**: 使用Helmet设置安全HTTP头

## 📊 监控和日志

### 健康检查
```http
GET /health
```

### 应用状态
```http
GET /api
```

### 日志文件
- `logs/app.log` - 应用日志
- `logs/error.log` - 错误日志
- `logs/access.log` - 访问日志

## 🚀 部署指南

### Docker部署

1. 构建镜像：
```bash
docker build -t express-enterprise-server .
```

2. 运行容器：
```bash
docker run -p 3000:3000 --env-file .env express-enterprise-server
```

### PM2部署

1. 安装PM2：
```bash
npm install -g pm2
```

2. 启动应用：
```bash
pm2 start server.js --name "express-server"
```

### 环境变量检查清单

#### 必需配置
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN
- [ ] PORT
- [ ] NODE_ENV
- [ ] BCRYPT_ROUNDS
- [ ] RATE_LIMIT_MAX

#### Redis配置（可选）
- [ ] CAPTCHA_USE_REDIS
- [ ] REDIS_HOST
- [ ] REDIS_PORT
- [ ] REDIS_PASSWORD
- [ ] REDIS_DB
- [ ] REDIS_KEY_PREFIX

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您有任何问题或建议，请创建 Issue 或联系维护者。

---

**注意**: 这是一个企业级架构模板，可根据具体业务需求进行定制和扩展。