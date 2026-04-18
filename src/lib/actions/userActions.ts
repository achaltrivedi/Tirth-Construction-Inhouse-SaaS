"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/security";

const ALLOWED_ROLES = ["admin", "operator", "supervisor", "user"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedRole(role: string): role is AllowedRole {
  return ALLOWED_ROLES.includes(role as AllowedRole);
}

export async function getUsers() {
  await requireUser(["admin"]);

  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUser(formData: FormData) {
  const adminUser = await requireUser(["admin"]);

  const name = normalizeText(formData.get("name"));
  const email = normalizeText(formData.get("email")).toLowerCase();
  const password = normalizeText(formData.get("password"));
  const roleInput = normalizeText(formData.get("role")) || "operator";

  if (!name) {
    return { success: false, error: "Name is required." };
  }

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  if (!email.includes("@")) {
    return { success: false, error: "Enter a valid email address." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  if (!isAllowedRole(roleInput)) {
    return { success: false, error: "Selected role is not supported." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { success: false, error: "A user with this email already exists." };
  }

  const passwordHash = await hash(password, 10);

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: roleInput,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "create-user",
        newValue: JSON.stringify({
          createdUserId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      },
    });

    return user;
  });

  logger.info("Admin created user", {
    adminUserId: adminUser.id,
    createdUserId: createdUser.id,
    email: createdUser.email,
    role: createdUser.role,
  });

  revalidatePath("/users");

  return { success: true, user: createdUser };
}
