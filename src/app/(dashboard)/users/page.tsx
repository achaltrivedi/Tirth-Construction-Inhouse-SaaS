import { requireUser } from "@/lib/security";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage() {
  await requireUser(["admin"]);

  return <UsersPageClient />;
}
