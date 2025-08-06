const cron = require("node-cron");
const UserService = require("../modules/user/services/user.service");
const logger = require("./logger");

class Scheduler {
    constructor() {
        this.userService = new UserService();
    }

    start() {
        // 每天凌晨2点执行清理任务
        cron.schedule("36 10 * * *", async () => {
            logger.info("开始执行定时头像清理任务");
            try {
                const result = await this.userService.cleanOrphanAvatars();
                logger.info("定时头像清理任务完成:", result);
            } catch (error) {
                logger.error("定时头像清理任务失败:", error);
            }
        });
        logger.info("✅ 定时任务调度器已启动");
    }
}

module.exports = Scheduler;
