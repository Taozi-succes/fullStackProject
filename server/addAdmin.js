const databaseService = require("./src/core/database/prisma");
const { PasswordUtils } = require("./src/shared/utils");
const { UserStatusEnum } = require("./src/common/enums");
const prisma = databaseService.getClient();

const username = "superAdmin";
const password = "abc123";
const email = "superadmin@example.com";
async function main() {

    // 查询是否有superAdmin用户
    const existingAdmin = await prisma.user.findFirst({
        where: {
            username,
        },
    });

    if (existingAdmin) {
        console.log("Super Admin 已存在！");
        throw new Error("Super Admin 已存在！");
        return;
    }

    const hashedPassword = await PasswordUtils.hash(password);
    const admin = await prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
            status: UserStatusEnum.ACTIVE,
            roles: JSON.stringify(["admin"]),
        },
    });
    console.log("Super Admin created:", admin);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
