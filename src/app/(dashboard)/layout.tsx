import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <Providers>
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">{children}</main>
            </div>
        </Providers>
    );
}
