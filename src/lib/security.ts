import { auth } from "@/lib/auth";

type AppRole = "admin" | "operator" | "supervisor";

type SessionUser = {
  id?: string;
  name?: string | null;
  role?: string;
};

export async function requireUser(allowedRoles?: AppRole[]) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role as AppRole))) {
    throw new Error("Forbidden");
  }

  return {
    id: user.id,
    name: user.name ?? "Unknown",
    role: (user.role ?? "operator") as AppRole,
  };
}

export function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
