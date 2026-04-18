import { hashSync } from "bcryptjs";
import { prisma } from "../src/lib/db";

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
    name: "Attendance Supervisor",
    email: "attendance@cols.com",
    password: "attendance@123",
    role: "supervisor",
  },
] as const;

async function main() {
  if (process.env.ALLOW_DEFAULT_SEED_USERS !== "true") {
    console.log("Skipping default user seed. Set ALLOW_DEFAULT_SEED_USERS=true to bootstrap login users.");
    return;
  }

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
      console.log(`User created: ${user.email}`);
    } else {
      console.log(`User already exists: ${user.email}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
