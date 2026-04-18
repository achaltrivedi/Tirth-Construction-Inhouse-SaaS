import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireEnv } from "@/lib/security";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = requireEnv(
  "DATABASE_URL",
  process.env.NODE_ENV === "production"
    ? undefined
    : "postgresql://cols_user:cols_password@localhost:5433/cols_db",
);

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
