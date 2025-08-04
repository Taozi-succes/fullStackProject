/**
 * 用户服务层
 * 处理用户相关的业务逻辑
 */
const databaseService = require("../../../core/database/prisma");
const logger = require("../../../core/logger");
const { PasswordUtils, JwtUtils } = require("../../../shared/utils");
const { UserResponseDto } = require("../dto/user.dto");
const {
    HTTP_STATUS,
    RESPONSE_MESSAGES,
    ERROR_CODES,
} = require("../../../common/constants");
const { UserStatusEnum } = require("../../../common/enums");
const CaptchaService = require("../../captcha/services/captcha.service");
const CaptchaRedisService = require("../../captcha/services/captcha-redis.service");

class UserService {
    constructor() {
        this.prisma = databaseService.getClient();

        // 根据配置选择验证码服务
        const useRedis = process.env.CAPTCHA_USE_REDIS === "true";
        if (useRedis) {
            this.captchaService = new CaptchaRedisService();
        } else {
            this.captchaService = new CaptchaService();
        }
    }

    /**
     * 用户登录
     * @param {Object} loginData - 登录数据
     * @returns {Object} 登录结果
     */
    async login(loginData) {
        try {
            const { username, password, captchaId, captchaCode } = loginData;

            // 验证验证码
            const captchaResult = await this.captchaService.verifyCaptcha(
                captchaId,
                captchaCode
            );
            if (!captchaResult.success) {
                logger.warn("登录失败：验证码验证失败", {
                    username,
                    captchaId,
                    error: captchaResult.error,
                });
                return {
                    success: false,
                    code: ERROR_CODES.CAPTCHA_INVALID,
                    message: captchaResult.message || "验证码验证失败",
                };
            }

            // 查找用户（支持用户名或邮箱登录）
            const user = await this.findUserByUsernameOrEmail(username);

            if (!user) {
                logger.warn("登录失败：用户不存在", { username });
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 检查用户状态
            if (user.status !== UserStatusEnum.ACTIVE) {
                logger.warn("登录失败：用户账户被禁用", {
                    userId: user.id,
                    status: user.status,
                });
                return {
                    success: false,
                    code: ERROR_CODES.ACCOUNT_DISABLED,
                    message: "账户已被禁用，请联系管理员",
                };
            }

            // 验证密码
            const isPasswordValid = await PasswordUtils.verify(
                password,
                user.password
            );
            if (!isPasswordValid) {
                logger.warn("登录失败：密码错误", { userId: user.id });
                return {
                    success: false,
                    code: ERROR_CODES.INVALID_CREDENTIALS,
                    message: RESPONSE_MESSAGES.PASSWORD_INCORRECT,
                };
            }

            // 更新最后登录时间
            await this.updateLastLogin(user.id);

            // 生成令牌
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
            };

            const accessToken = JwtUtils.generateAccessToken(tokenPayload);
            const refreshToken = JwtUtils.generateRefreshToken(tokenPayload);

            // 返回用户信息和令牌
            const userResponse = new UserResponseDto(user);

            logger.info("用户登录成功", {
                userId: user.id,
                username: user.username,
            });

            return {
                success: true,
                message: RESPONSE_MESSAGES.LOGIN_SUCCESS,
                data: {
                    // user: userResponse.toProfile(),
                    tokens: {
                        accessToken,
                        refreshToken,
                        tokenType: "Bearer",
                        expiresIn: 24 * 60 * 60, // 24小时，单位：秒
                    },
                },
            };
        } catch (error) {
            logger.error("用户登录过程中发生错误:", error);
            throw new Error("登录服务异常");
        }
    }

    /**
     * 用户注册
     * @param {Object} registerData - 注册数据
     * @returns {Object} 注册结果
     */
    async register(registerData) {
        try {
            const { username, email, password, captchaId, captchaCode } =
                registerData;

            // 验证验证码
            const captchaResult = await this.captchaService.verifyCaptcha(
                captchaId,
                captchaCode
            );
            if (!captchaResult.success) {
                logger.warn("注册失败：验证码验证失败", {
                    username,
                    email,
                    captchaId,
                    error: captchaResult.error,
                });
                return {
                    success: false,
                    code: ERROR_CODES.CAPTCHA_INVALID,
                    message: captchaResult.message || "验证码验证失败",
                };
            }

            // 检查用户名是否已存在
            const existingUserByUsername = await this.findUserByUsername(
                username
            );
            if (existingUserByUsername) {
                logger.warn("注册失败：用户名已存在", { username });
                return {
                    success: false,
                    code: ERROR_CODES.USER_ALREADY_EXISTS,
                    message: "用户名已存在",
                };
            }

            // 检查邮箱是否已存在
            const existingUserByEmail = await this.findUserByEmail(email);
            if (existingUserByEmail) {
                logger.warn("注册失败：邮箱已存在", { email });
                return {
                    success: false,
                    code: ERROR_CODES.USER_ALREADY_EXISTS,
                    message: "邮箱已存在",
                };
            }

            // 加密密码
            const hashedPassword = await PasswordUtils.hash(password);

            // 创建用户
            const newUser = await this.prisma.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    status: UserStatusEnum.ACTIVE,
                    roles: JSON.stringify(["user"]),
                },
            });

            // 返回用户信息（不包含密码）
            const userResponse = new UserResponseDto(newUser);

            logger.info("用户注册成功", {
                userId: newUser.id,
                username,
                email,
            });

            return {
                success: true,
                message: RESPONSE_MESSAGES.USER_CREATED,
                data: {
                    user: userResponse.toPublic(),
                },
            };
        } catch (error) {
            logger.error("用户注册过程中发生错误:", error);
            throw new Error("注册服务异常");
        }
    }

    /**
     * 获取用户信息
     * @param {number} userId - 用户ID
     * @returns {Object} 用户信息
     */
    async getUserInfo(userId) {
        try {
            const user = await this.findUserById(userId);

            if (!user) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            const userResponse = new UserResponseDto(user);

            return {
                success: true,
                message: "获取用户信息成功",
                data: {
                    user: userResponse.toProfile(),
                },
            };
        } catch (error) {
            logger.error("获取用户信息过程中发生错误:", error);
            throw new Error("获取用户信息服务异常");
        }
    }

    /**
     * 更新用户信息
     * @param {number} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {Object} 更新结果
     */
    async updateUser(userId, updateData) {
        try {
            // 检查用户是否存在
            const existingUser = await this.findUserById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 如果更新用户名，检查是否已存在
            if (
                updateData.username &&
                updateData.username !== existingUser.username
            ) {
                const userWithSameUsername = await this.findUserByUsername(
                    updateData.username
                );
                if (userWithSameUsername) {
                    return {
                        success: false,
                        code: ERROR_CODES.USER_ALREADY_EXISTS,
                        message: "用户名已存在",
                    };
                }
            }

            // 如果更新邮箱，检查是否已存在
            if (updateData.email && updateData.email !== existingUser.email) {
                const userWithSameEmail = await this.findUserByEmail(
                    updateData.email
                );
                if (userWithSameEmail) {
                    return {
                        success: false,
                        code: ERROR_CODES.USER_ALREADY_EXISTS,
                        message: "邮箱已存在",
                    };
                }
            }

            // 更新用户信息
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });

            const userResponse = new UserResponseDto(updatedUser);

            logger.info("用户信息更新成功", {
                userId,
                updateFields: Object.keys(updateData),
            });

            return {
                success: true,
                message: RESPONSE_MESSAGES.USER_UPDATED,
                data: {
                    user: userResponse.toProfile(),
                },
            };
        } catch (error) {
            logger.error("更新用户信息过程中发生错误:", error);
            throw new Error("更新用户信息服务异常");
        }
    }

    /**
     * 管理员更新用户信息
     * @param {number} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {Object} 更新结果
     */
    async adminUpdateUser(userId, updateData) {
        try {
            // 检查用户是否存在
            const existingUser = await this.findUserById(userId);
            if (!existingUser) {
                logger.warn("管理员更新用户失败：用户不存在", { userId });
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 如果更新用户名，检查是否重复
            if (
                updateData.username &&
                updateData.username !== existingUser.username
            ) {
                const userWithSameUsername = await this.findUserByUsername(
                    updateData.username
                );
                if (userWithSameUsername) {
                    logger.warn("管理员更新用户失败：用户名已存在", {
                        userId,
                        username: updateData.username,
                    });
                    return {
                        success: false,
                        code: ERROR_CODES.USER_ALREADY_EXISTS,
                        message: "用户名已存在",
                    };
                }
            }

            // 如果更新邮箱，检查是否重复
            if (updateData.email && updateData.email !== existingUser.email) {
                const userWithSameEmail = await this.findUserByEmail(
                    updateData.email
                );
                if (userWithSameEmail) {
                    logger.warn("管理员更新用户失败：邮箱已存在", {
                        userId,
                        email: updateData.email,
                    });
                    return {
                        success: false,
                        code: ERROR_CODES.USER_ALREADY_EXISTS,
                        message: "邮箱已存在",
                    };
                }
            }

            // 更新用户信息
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });

            // 返回更新后的用户信息
            const userResponse = new UserResponseDto(updatedUser);

            logger.info("管理员更新用户成功", {
                userId,
                updatedFields: Object.keys(updateData),
            });

            return {
                success: true,
                message: "用户信息更新成功",
                data: {
                    user: userResponse.toProfile(),
                },
            };
        } catch (error) {
            logger.error("管理员更新用户过程中发生错误:", error);
            throw new Error("更新用户服务异常");
        }
    }

    /**
     * 修改密码
     * @param {number} userId - 用户ID
     * @param {Object} passwordData - 密码数据
     * @returns {Object} 修改结果
     */
    async changePassword(userId, passwordData) {
        try {
            const { currentPassword, newPassword } = passwordData;

            // 获取用户信息
            const user = await this.findUserById(userId);
            if (!user) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 验证当前密码
            const isCurrentPasswordValid = await PasswordUtils.verify(
                currentPassword,
                user.password
            );
            if (!isCurrentPasswordValid) {
                logger.warn("修改密码失败：当前密码错误", { userId });
                return {
                    success: false,
                    code: ERROR_CODES.INVALID_CREDENTIALS,
                    message: "当前密码错误",
                };
            }

            // 加密新密码
            const hashedNewPassword = await PasswordUtils.hash(newPassword);

            // 更新密码
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedNewPassword,
                    updatedAt: new Date(),
                },
            });

            logger.info("用户密码修改成功", { userId });

            return {
                success: true,
                message: RESPONSE_MESSAGES.PASSWORD_UPDATED,
            };
        } catch (error) {
            logger.error("修改密码过程中发生错误:", error);
            throw new Error("修改密码服务异常");
        }
    }

    /**
     * 刷新令牌
     * @param {string} refreshToken - 刷新令牌
     * @returns {Object} 刷新结果
     */
    async refreshToken(refreshToken) {
        try {
            // 验证刷新令牌
            const decoded = JwtUtils.verifyToken(refreshToken);

            if (decoded.type !== "refresh") {
                return {
                    success: false,
                    code: ERROR_CODES.TOKEN_INVALID,
                    message: "无效的刷新令牌",
                };
            }

            // 检查用户是否存在
            const user = await this.findUserById(decoded.userId);
            if (!user) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 检查用户状态
            if (user.status !== UserStatusEnum.ACTIVE) {
                return {
                    success: false,
                    code: ERROR_CODES.ACCOUNT_DISABLED,
                    message: "账户已被禁用",
                };
            }

            // 生成新的令牌
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
            };

            const newAccessToken = JwtUtils.generateAccessToken(tokenPayload);
            const newRefreshToken = JwtUtils.generateRefreshToken(tokenPayload);

            logger.info("令牌刷新成功", { userId: user.id });

            return {
                success: true,
                message: "令牌刷新成功",
                data: {
                    tokens: {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                        tokenType: "Bearer",
                        expiresIn: 24 * 60 * 60,
                    },
                },
            };
        } catch (error) {
            if (error.message.includes("TOKEN_")) {
                return {
                    success: false,
                    code: error.message,
                    message: RESPONSE_MESSAGES.TOKEN_INVALID,
                };
            }

            logger.error("刷新令牌过程中发生错误:", error);
            throw new Error("刷新令牌服务异常");
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 根据ID查找用户
     * @param {number} userId - 用户ID
     * @returns {Object|null} 用户信息
     */
    async findUserById(userId) {
        return await this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    /**
     * 根据用户名查找用户
     * @param {string} username - 用户名
     * @returns {Object|null} 用户信息
     */
    async findUserByUsername(username) {
        return await this.prisma.user.findUnique({
            where: { username },
        });
    }

    /**
     * 根据邮箱查找用户
     * @param {string} email - 邮箱
     * @returns {Object|null} 用户信息
     */
    async findUserByEmail(email) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }

    /**
     * 根据用户名或邮箱查找用户
     * @param {string} identifier - 用户名或邮箱
     * @returns {Object|null} 用户信息
     */
    async findUserByUsernameOrEmail(identifier) {
        return await this.prisma.user.findFirst({
            where: {
                OR: [{ username: identifier }, { email: identifier }],
            },
        });
    }

    /**
     * 更新最后登录时间
     * @param {number} userId - 用户ID
     */
    async updateLastLogin(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                lastLoginAt: new Date(),
            },
        });
    }

    /**
     * 更新用户角色
     * @param {number} userId - 用户ID
     * @param {string[]} roles - 角色数组
     * @returns {Object} 更新结果
     */
    async updateUserRoles(userId, roles) {
        try {
            // 检查用户是否存在
            const user = await this.findUserById(userId);
            if (!user) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: RESPONSE_MESSAGES.USER_NOT_FOUND,
                };
            }

            // 更新用户角色
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    roles: JSON.stringify(roles),
                    updatedAt: new Date(),
                },
            });

            logger.info("用户角色更新成功", { userId, roles });

            return {
                success: true,
                message: "用户角色更新成功",
                data: {
                    user: new UserResponseDto(updatedUser).toProfile(),
                },
            };
        } catch (error) {
            logger.error("更新用户角色过程中发生错误:", error);
            throw new Error("更新用户角色服务异常");
        }
    }

    /**
     * 获取所有用户列表
     * @param {Object} options - 查询选项
     * @param {number} options.page - 页码
     * @param {number} options.limit - 每页数量
     * @param {string} options.search - 搜索关键词
     * @returns {Object} 操作结果
     */
    async getAllUsers(options = {}) {
        try {
            const { page = 1, limit = 10, search = "" } = options;
            const skip = (page - 1) * limit;

            // 构建查询条件
            const where = {
                status: {
                    not: "DELETED", // 排除被禁用的用户，或者改为 in: ['ACTIVE', 'INACTIVE']
                },
            };

            // 如果有搜索关键词，添加搜索条件
            if (search) {
                where.OR = [
                    {
                        username: {
                            contains: search,
                        },
                    },
                    {
                        email: {
                            contains: search,
                        },
                    },
                ];
            }

            // 查询用户列表和总数
            const [users, total] = await Promise.all([
                this.prisma.user.findMany({
                    where,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatar: true,
                        status: true,
                        roles: true,
                        createdAt: true,
                        updatedAt: true,
                        lastLoginAt: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                this.prisma.user.count({ where }),
            ]);

            console.log("用户列表users:===", users);
            return {
                users: users.map((user) => ({
                    ...user,
                    roles: JSON.parse(user.roles),
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error("获取所有用户服务错误:", error);
            return false;
        }
    }

    /**
     * 删除用户
     * @param {number} userId - 用户ID
     * @returns {Object} 操作结果
     */
    async deleteUser(userId) {
        try {
            // 检查用户是否存在

            const existingUser = await this.findUserById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: "用户不存在",
                };
            }

            // 检查用户是否已被删除
            if (existingUser.status === "DELETED") {
                return {
                    success: false,
                    code: ERROR_CODES.USER_NOT_FOUND,
                    message: "用户已被禁用",
                };
            }

            // 软删除用户（将状态设置为DELETED）
            const deletedUser = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    status: "DELETED",
                    updatedAt: new Date(),
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    status: true,
                },
            });

            logger.info("用户删除成功", {
                userId,
                username: deletedUser.username,
            });

            return {
                success: true,
                message: "用户删除成功",
                data: {
                    user: deletedUser,
                },
            };
        } catch (error) {
            logger.error("删除用户服务错误:", error);
            return {
                success: false,
                code: ERROR_CODES.INTERNAL_ERROR,
                message: "删除用户失败",
            };
        }
    }
}

module.exports = UserService;
