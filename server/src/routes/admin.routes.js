/**
 * 管理员路由
 * 处理管理员相关的路由
 */
const express = require('express');
const { authenticateToken,requireRole } = require('../shared/helpers');
const UserController = require('../modules/user/controllers/user.controller');
const userController = new UserController();

const router = express.Router();

/**
 * @route   PUT /api/admin/user/:id
 * @desc    管理员更新用户信息
 * @access  Private (Admin only)
 */
router.put('/user/:id', authenticateToken,requireRole('admin'), userController.adminUpdateUser);

module.exports = router;