import { defineConfig } from "prisma/config";

function requireDatabaseUrl() {
  const value =
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "postgresql://cols_user:cols_password@localhost:5433/cols_db");

  if (!value) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return value;
}

const databaseUrl = requireDatabaseUrl();

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
