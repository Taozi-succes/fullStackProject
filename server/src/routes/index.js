/**
 * 主路由文件
 * 统一管理所有API路由
 */
const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const captchaRoutes = require("./captcha.routes");
const { notFoundHandler } = require("../shared/helpers");
const logger = require("../core/logger");
const dayjs = require("dayjs");
const router = express.Router();

// API版本信息
router.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Express API Server",
        version: "1.0.0",
        timestamp: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
        endpoints: {
            auth: "/api/auth",
            user: "/api/user",
            captcha: "/api/captcha",
            admin: "/api/admin"
        },
    });
});

// 注册子路由
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/captcha", captchaRoutes);
router.use("/admin", adminRoutes);


// 404处理
router.use("*", notFoundHandler);

module.exports = router;
