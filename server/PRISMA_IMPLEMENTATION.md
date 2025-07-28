# Prisma 实施指南 - 完整实战教程 🚀

## 🎯 实施目标

将您当前的 MySQL + mysql2 架构升级为 Prisma ORM，实现类型安全的数据访问层。

## 📋 实施步骤

### 第一步：安装 Prisma

```bash
# 在 server 目录下执行
cd server

# 安装 Prisma CLI 和客户端
npm install prisma @prisma/client
npm install -D prisma

# 初始化 Prisma
npx prisma init
```

### 第二步：配置环境变量

```env
# .env (更新您的环境变量)
DATABASE_URL="mysql://root:password@localhost:3306/your_database"

# 其他现有配置保持不变
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### 第三步：定义 Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  lastLogin DateTime? @map("last_login")
  isActive  Boolean  @default(true) @map("is_active")
  
  // 关系
  profile   Profile?
  posts     Post[]
  sessions  UserSession[]
  
  @@map("users")
}

// 用户资料
model Profile {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique @map("user_id")
  firstName String?  @map("first_name") @db.VarChar(50)
  lastName  String?  @map("last_name") @db.VarChar(50)
  bio       String?  @db.Text
  avatar    String?  @db.VarChar(255)
  phone     String?  @db.VarChar(20)
  birthday  DateTime?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // 关系
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}

// 文章模型（扩展示例）
model Post {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(200)
  content   String   @db.Text
  excerpt   String?  @db.VarChar(500)
  published Boolean  @default(false)
  authorId  Int      @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // 关系
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      PostTag[]
  
  @@map("posts")
}

// 标签模型
model Tag {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(50)
  color     String?  @db.VarChar(7) // HEX 颜色
  createdAt DateTime @default(now()) @map("created_at")
  
  // 关系
  posts     PostTag[]
  
  @@map("tags")
}

// 文章标签关联表
model PostTag {
  postId Int @map("post_id")
  tagId  Int @map("tag_id")
  
  // 关系
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([postId, tagId])
  @@map("post_tags")
}

// 用户会话（用于 JWT 黑名单）
model UserSession {
  id        String   @id @default(cuid())
  userId    Int      @map("user_id")
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  isRevoked Boolean  @default(false) @map("is_revoked")
  
  // 关系
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_sessions")
}
```

### 第四步：生成和迁移数据库

```bash
# 从现有数据库生成 Schema（如果您已有数据）
npx prisma db pull

# 或者创建新的迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

### 第五步：创建 Prisma 客户端

```javascript
// src/models/prisma.js
const { PrismaClient } = require('@prisma/client');

/**
 * Prisma 客户端单例
 * 配置日志、错误格式和连接管理
 */
class PrismaService {
  constructor() {
    this.prisma = new PrismaClient({
      log: this.getLogLevel(),
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * 根据环境设置日志级别
   */
  getLogLevel() {
    if (process.env.NODE_ENV === 'development') {
      return ['query', 'info', 'warn', 'error'];
    }
    return ['error'];
  }
  
  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // 查询日志
    this.prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Query: ' + e.query);
        console.log('Params: ' + e.params);
        console.log('Duration: ' + e.duration + 'ms');
      }
    });
    
    // 优雅关闭
    process.on('beforeExit', async () => {
      console.log('Disconnecting from database...');
      await this.prisma.$disconnect();
    });
    
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, disconnecting from database...');
      await this.prisma.$disconnect();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, disconnecting from database...');
      await this.prisma.$disconnect();
      process.exit(0);
    });
  }
  
  /**
   * 获取 Prisma 客户端实例
   */
  getClient() {
    return this.prisma;
  }
  
  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// 创建单例实例
const prismaService = new PrismaService();
const prisma = prismaService.getClient();

module.exports = {
  prisma,
  prismaService
};
```

### 第六步：创建基础模型类

```javascript
// src/models/BaseModel.js
const { prisma } = require('./prisma');

/**
 * 基础模型类
 * 提供通用的 CRUD 操作和工具方法
 */
class BaseModel {
  constructor(modelName) {
    this.model = prisma[modelName];
    this.modelName = modelName;
  }
  
  /**
   * 查找单个记录
   */
  async findUnique(where, options = {}) {
    try {
      return await this.model.findUnique({
        where,
        ...options
      });
    } catch (error) {
      this.handleError(error, 'findUnique');
    }
  }
  
  /**
   * 查找多个记录
   */
  async findMany(options = {}) {
    try {
      return await this.model.findMany(options);
    } catch (error) {
      this.handleError(error, 'findMany');
    }
  }
  
  /**
   * 创建记录
   */
  async create(data, options = {}) {
    try {
      return await this.model.create({
        data,
        ...options
      });
    } catch (error) {
      this.handleError(error, 'create');
    }
  }
  
  /**
   * 更新记录
   */
  async update(where, data, options = {}) {
    try {
      return await this.model.update({
        where,
        data,
        ...options
      });
    } catch (error) {
      this.handleError(error, 'update');
    }
  }
  
  /**
   * 删除记录
   */
  async delete(where, options = {}) {
    try {
      return await this.model.delete({
        where,
        ...options
      });
    } catch (error) {
      this.handleError(error, 'delete');
    }
  }
  
  /**
   * 计数
   */
  async count(where = {}) {
    try {
      return await this.model.count({ where });
    } catch (error) {
      this.handleError(error, 'count');
    }
  }
  
  /**
   * 分页查询
   */
  async paginate(options = {}) {
    const {
      page = 1,
      limit = 10,
      where = {},
      orderBy = { id: 'desc' },
      include,
      select
    } = options;
    
    const skip = (page - 1) * limit;
    
    try {
      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include,
          select
        }),
        this.model.count({ where })
      ]);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.handleError(error, 'paginate');
    }
  }
  
  /**
   * 错误处理
   */
  handleError(error, operation) {
    console.error(`${this.modelName} ${operation} error:`, error);
    
    // Prisma 特定错误处理
    if (error.code === 'P2002') {
      throw new Error(`唯一约束违反: ${error.meta?.target?.join(', ')}`);
    }
    
    if (error.code === 'P2025') {
      throw new Error('记录不存在');
    }
    
    throw error;
  }
}

module.exports = BaseModel;
```

### 第七步：重构用户模型

```javascript
// src/models/UserModel.js
const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');

/**
 * 用户模型
 * 继承基础模型，提供用户特定的业务方法
 */
class UserModel extends BaseModel {
  constructor() {
    super('user');
  }
  
  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    return await this.findUnique(
      { username },
      {
        include: {
          profile: true,
          _count: {
            select: {
              posts: true,
              sessions: true
            }
          }
        }
      }
    );
  }
  
  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email) {
    return await this.findUnique({ email });
  }
  
  /**
   * 根据 ID 获取用户信息（安全版本，不包含密码）
   */
  async findByIdSafe(id) {
    return await this.findUnique(
      { id },
      {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          lastLogin: true,
          isActive: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              bio: true,
              avatar: true,
              phone: true,
              birthday: true
            }
          },
          _count: {
            select: {
              posts: true
            }
          }
        }
      }
    );
  }
  
  /**
   * 创建新用户
   */
  async createUser(userData) {
    const { username, email, password, profile } = userData;
    
    // 密码加密
    const hashedPassword = await this.hashPassword(password);
    
    return await this.create(
      {
        username,
        email,
        password: hashedPassword,
        profile: profile ? {
          create: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            bio: profile.bio,
            phone: profile.phone,
            birthday: profile.birthday ? new Date(profile.birthday) : null
          }
        } : undefined
      },
      {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              bio: true
            }
          }
        }
      }
    );
  }
  
  /**
   * 验证密码
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  /**
   * 密码加密
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }
  
  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id) {
    return await this.update(
      { id },
      { lastLogin: new Date() },
      {
        select: {
          id: true,
          lastLogin: true
        }
      }
    );
  }
  
  /**
   * 更新用户资料
   */
  async updateProfile(userId, profileData) {
    return await this.update(
      { id: userId },
      {
        profile: {
          upsert: {
            create: profileData,
            update: profileData
          }
        }
      },
      {
        include: {
          profile: true
        }
      }
    );
  }
  
  /**
   * 获取用户列表（管理员功能）
   */
  async getUserList(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    // 构建查询条件
    const where = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
          {
            profile: {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } }
              ]
            }
          }
        ]
      })
    };
    
    return await this.paginate({
      page,
      limit,
      where,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            posts: true
          }
        }
      }
    });
  }
  
  /**
   * 软删除用户（停用账户）
   */
  async deactivateUser(id) {
    return await this.update(
      { id },
      { isActive: false },
      {
        select: {
          id: true,
          username: true,
          isActive: true
        }
      }
    );
  }
  
  /**
   * 激活用户
   */
  async activateUser(id) {
    return await this.update(
      { id },
      { isActive: true },
      {
        select: {
          id: true,
          username: true,
          isActive: true
        }
      }
    );
  }
}

module.exports = new UserModel();
```

### 第八步：更新服务层

```javascript
// src/services/userService.js (Prisma 版本)
const UserModel = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

class UserService {
  /**
   * 用户登录
   */
  static async login(credentials) {
    try {
      const { username, password } = credentials;
      
      // 查找用户（包含密码用于验证）
      const user = await UserModel.findByUsername(username);
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          code: 401
        };
      }
      
      // 检查账户状态
      if (!user.isActive) {
        return {
          success: false,
          message: '账户已被停用',
          code: 403
        };
      }
      
      // 验证密码
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: '密码错误',
          code: 401
        };
      }
      
      // 更新最后登录时间
      await UserModel.updateLastLogin(user.id);
      
      // 生成 Token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          email: user.email
        },
        config.jwtSecret,
        { expiresIn: '2h' }
      );
      
      // 返回用户信息（不包含密码）
      const { password: _, ...userInfo } = user;
      
      return {
        success: true,
        message: '登录成功',
        data: {
          token,
          user: userInfo
        }
      };
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户信息
   */
  static async getUserInfo(userId) {
    try {
      const user = await UserModel.findByIdSafe(userId);
      
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
          code: 404
        };
      }
      
      return {
        success: true,
        message: '获取用户信息成功',
        data: user
      };
    } catch (error) {
      console.error('GetUserInfo service error:', error);
      throw error;
    }
  }
  
  /**
   * 创建用户
   */
  static async createUser(userData) {
    try {
      // 检查用户名是否存在
      const existingUser = await UserModel.findByUsername(userData.username);
      if (existingUser) {
        return {
          success: false,
          message: '用户名已存在',
          code: 409
        };
      }
      
      // 检查邮箱是否存在
      const existingEmail = await UserModel.findByEmail(userData.email);
      if (existingEmail) {
        return {
          success: false,
          message: '邮箱已存在',
          code: 409
        };
      }
      
      // 创建用户
      const user = await UserModel.createUser(userData);
      
      return {
        success: true,
        message: '用户创建成功',
        data: user
      };
    } catch (error) {
      console.error('CreateUser service error:', error);
      throw error;
    }
  }
  
  /**
   * 更新用户资料
   */
  static async updateProfile(userId, profileData) {
    try {
      const user = await UserModel.updateProfile(userId, profileData);
      
      return {
        success: true,
        message: '资料更新成功',
        data: user
      };
    } catch (error) {
      console.error('UpdateProfile service error:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户列表（管理员功能）
   */
  static async getUserList(options) {
    try {
      const result = await UserModel.getUserList(options);
      
      return {
        success: true,
        message: '获取用户列表成功',
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('GetUserList service error:', error);
      throw error;
    }
  }
}

module.exports = UserService;
```

### 第九步：更新 package.json 脚本

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "npx nodemon ./src/main.js",
    "db:generate": "npx prisma generate",
    "db:migrate": "npx prisma migrate dev",
    "db:deploy": "npx prisma migrate deploy",
    "db:studio": "npx prisma studio",
    "db:seed": "node prisma/seed.js",
    "db:reset": "npx prisma migrate reset"
  }
}
```

### 第十步：创建数据库种子文件

```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库种子...');
  
  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      profile: {
        create: {
          firstName: '管理员',
          lastName: '用户',
          bio: '系统管理员账户'
        }
      }
    }
  });
  
  // 创建测试用户
  const testPassword = await bcrypt.hash('test123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@example.com',
      password: testPassword,
      profile: {
        create: {
          firstName: '测试',
          lastName: '用户',
          bio: '这是一个测试用户账户'
        }
      }
    }
  });
  
  console.log('种子数据创建完成:', { admin, testUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 🚀 迁移执行

```bash
# 1. 生成 Prisma Client
npm run db:generate

# 2. 运行迁移
npm run db:migrate

# 3. 填充种子数据
npm run db:seed

# 4. 启动 Prisma Studio（可选）
npm run db:studio

# 5. 启动应用
npm start
```

## 📋 验证清单

- [ ] Prisma 安装成功
- [ ] Schema 定义完成
- [ ] 数据库迁移成功
- [ ] 模型类创建完成
- [ ] 服务层更新完成
- [ ] 种子数据填充成功
- [ ] 应用启动正常
- [ ] API 测试通过

## 🎯 下一步优化

1. **添加数据验证**：使用 Prisma 的验证功能
2. **实现缓存**：Redis + Prisma 缓存策略
3. **添加日志**：结构化日志记录
4. **性能监控**：查询性能分析
5. **TypeScript 迁移**：获得更好的类型安全

现在您的项目已经具备了现代化的 ORM 支持，享受 Prisma 带来的开发效率提升吧！ 🎉