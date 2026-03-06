import { prisma } from "../src/lib/db";
import { hashSync } from "bcryptjs";

async function main() {
    // Create default admin user
    const adminExists = await prisma.user.findUnique({
        where: { email: "admin@cols.local" },
    });

    if (!adminExists) {
        await prisma.user.create({
            data: {
                name: "Admin",
                email: "admin@cols.local",
                password: hashSync("admin123", 10),
                role: "admin",
            },
        });
        console.log("✅ Default admin user created: admin@cols.local / admin123");
    } else {
        console.log("ℹ️  Admin user already exists.");
    }

    // Create a default operator user
    const operatorExists = await prisma.user.findUnique({
        where: { email: "operator@cols.local" },
    });

    if (!operatorExists) {
        await prisma.user.create({
            data: {
                name: "Operator",
                email: "operator@cols.local",
                password: hashSync("operator123", 10),
                role: "operator",
            },
        });
        console.log("✅ Default operator user created: operator@cols.local / operator123");
    } else {
        console.log("ℹ️  Operator user already exists.");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
