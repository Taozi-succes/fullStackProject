/**
 * 测试用户角色管理API
 * 验证角色更新功能是否正常工作
 */

const http = require('http');
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';

// HTTP请求辅助函数
function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(body)
          };
          if (res.statusCode >= 400) {
            const error = new Error(`HTTP ${res.statusCode}`);
            error.response = response;
            reject(error);
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试用户凭据
const TEST_ADMIN = {
  username: 'admin',
  password: 'admin1234'
};

const TEST_USER = {
  username: 'testuser',
  password: 'test123'
};

async function testRolesAPI() {
  try {
    console.log('🚀 开始测试用户角色管理API...');
    
    // 1. 创建测试管理员用户（如果不存在）
    console.log('\n1. 检查并创建测试管理员用户...');
    let adminUser = await prisma.user.findUnique({
      where: { username: TEST_ADMIN.username }
    });
    
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(TEST_ADMIN.password, 10);
      
      adminUser = await prisma.user.create({
        data: {
          username: TEST_ADMIN.username,
          email: 'admin@test.com',
          password: hashedPassword,
          status: 'ACTIVE',
          roles: JSON.stringify(['admin', 'editor'])
        }
      });
      console.log('✅ 管理员用户创建成功');
    } else {
      // 确保管理员有admin角色
      let currentRoles;
      try {
        currentRoles = JSON.parse(adminUser.roles || '["user"]');
      } catch (e) {
        // 如果roles字段不是有效的JSON，设置默认值
        currentRoles = ['user'];
      }
      
      // 重置密码和角色确保测试正常
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(TEST_ADMIN.password, 10);
      
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          password: hashedPassword,
          status: 'ACTIVE',
          roles: JSON.stringify(['admin', 'editor'])
        }
      });
      console.log('✅ 管理员用户已存在，密码和角色已重置');
    }
    
    // 2. 创建测试普通用户（如果不存在）
    console.log('\n2. 检查并创建测试普通用户...');
    let testUser = await prisma.user.findUnique({
      where: { username: TEST_USER.username }
    });
    
    if (!testUser) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
      
      testUser = await prisma.user.create({
        data: {
          username: TEST_USER.username,
          email: 'testuser@test.com',
          password: hashedPassword,
          status: 'ACTIVE',
          roles: JSON.stringify(['user'])
        }
      });
      console.log('✅ 测试用户创建成功');
    } else {
      // 重置密码确保测试正常
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
      
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          password: hashedPassword,
          status: 'ACTIVE'
        }
      });
      console.log('✅ 测试用户已存在，密码已重置');
    }
    
    // 3. 管理员登录（跳过验证码验证）
    console.log('\n3. 管理员登录获取访问令牌...');
    const adminLoginResponse = await makeRequest('POST', `${BASE_URL}/auth/login`, {
      username: TEST_ADMIN.username,
      password: TEST_ADMIN.password,
      captchaId: 'test_captcha_id',
      captchaCode: 'test' // 使用测试验证码
    });
    
    if (!adminLoginResponse.data.success) {
      throw new Error('管理员登录失败: ' + adminLoginResponse.data.message);
    }
    
    const adminToken = adminLoginResponse.data.data.tokens.accessToken;
    console.log('✅ 管理员登录成功');
    
    // 4. 普通用户登录（跳过验证码验证）
    console.log('\n4. 普通用户登录获取访问令牌...');
    const userLoginResponse = await makeRequest('POST', `${BASE_URL}/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password,
      captchaId: 'test_captcha_id',
      captchaCode: 'test' // 使用测试验证码
    });
    
    if (!userLoginResponse.data.success) {
      throw new Error('普通用户登录失败: ' + userLoginResponse.data.message);
    }
    
    const userToken = userLoginResponse.data.data.tokens.accessToken;
    console.log('✅ 普通用户登录成功');
    
    // 5. 测试普通用户尝试更新角色（应该失败）
    console.log('\n5. 测试普通用户尝试更新角色（应该被拒绝）...');
    try {
      await makeRequest('PUT', `${BASE_URL}/user/${testUser.id}/roles`, 
        { roles: ['admin', 'user'] },
        { Authorization: `Bearer ${userToken}` }
      );
      console.log('❌ 测试失败：普通用户不应该能够更新角色');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ 权限验证正常：普通用户无法更新角色');
      } else {
        console.log('❌ 意外错误:', error.message);
      }
    }
    
    // 6. 测试管理员更新用户角色（应该成功）
    console.log('\n6. 测试管理员更新用户角色...');
    const updateRolesResponse = await makeRequest('PUT', `${BASE_URL}/user/${testUser.id}/roles`, 
      { roles: ['user', 'moderator'] },
      { Authorization: `Bearer ${adminToken}` }
    );
    
    if (updateRolesResponse.data.success) {
      console.log('✅ 管理员成功更新用户角色');
      console.log('   新角色:', updateRolesResponse.data.data.user.roles);
    } else {
      console.log('❌ 角色更新失败:', updateRolesResponse.data.message);
    }
    
    // 7. 验证角色更新是否生效
    console.log('\n7. 验证角色更新是否生效...');
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    let updatedRoles;
    try {
      updatedRoles = JSON.parse(updatedUser.roles || '["user"]');
    } catch (e) {
      updatedRoles = ['user'];
    }
    console.log('   数据库中的角色:', updatedRoles);
    
    if (updatedRoles.includes('moderator') && updatedRoles.includes('user')) {
      console.log('✅ 角色更新验证成功');
    } else {
      console.log('❌ 角色更新验证失败');
    }
    
    // 8. 测试无效角色（应该失败）
    console.log('\n8. 测试无效角色（应该被拒绝）...');
    try {
      await makeRequest('PUT', `${BASE_URL}/user/${testUser.id}/roles`, 
        { roles: ['invalid_role'] },
        { Authorization: `Bearer ${adminToken}` }
      );
      console.log('❌ 测试失败：不应该接受无效角色');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 输入验证正常：无效角色被拒绝');
      } else {
        console.log('❌ 意外错误:', error.message);
      }
    }
    
    console.log('\n🎉 用户角色管理API测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
if (require.main === module) {
  testRolesAPI();
}

module.exports = { testRolesAPI };