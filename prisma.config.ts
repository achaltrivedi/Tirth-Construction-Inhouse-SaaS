import { defineConfig, env } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://cols_user:cols_password@db:5432/cols_db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
