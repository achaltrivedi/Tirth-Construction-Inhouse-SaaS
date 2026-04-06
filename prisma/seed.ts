import { prisma } from "../src/lib/db";
import { hashSync } from "bcryptjs";

const USERS = [
    {
        name: "Admin",
        email: "admin@cols.com",
        password: "admin@123",
        role: "admin",
    },
    {
        name: "Milin Trivedi",
        email: "milin@cols.com",
        password: "milin@123",
        role: "operator",
    },
    {
        name: "Bhavesh Patel",
        email: "bhavesh@cols.com",
        password: "bhavesh@123",
        role: "operator",
    },
    {
        name: "User",
        email: "user@cols.com",
        password: "user@123",
        role: "user",
    },
];

async function main() {
    for (const user of USERS) {
        const exists = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (!exists) {
            await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    password: hashSync(user.password, 10),
                    role: user.role,
                },
            });
            console.log(`✅ User created: ${user.email} / ${user.password}`);
        } else {
            console.log(`ℹ️  User already exists: ${user.email}`);
        }
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
