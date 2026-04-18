import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const users = [
    {
      name: "Milin Trivedi",
      email: "milin@cols.com",
      password: "milin@123",
      role: "operator"
    },
    {
      name: "Bhavesh Patel",
      email: "bhavesh@cols.com",
      password: "bhavesh@123",
      role: "operator"
    },
    {
      name: "User",
      email: "user@cols.com",
      password: "user@123",
      role: "user"
    }
  ]

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10)

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hash,
        role: user.role
      }
    })
  }

  console.log("✅ Seed completed")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })