"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    LayoutDashboard,
    Building2,
    BookOpen,
    Users,
    CalendarCheck,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sites", label: "Sites", icon: Building2 },
    { href: "/ledger", label: "Master Ledger", icon: BookOpen },
    { href: "/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/workers", label: "Workers", icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    const user = session?.user as { name?: string; role?: string } | undefined;

    return (
        <>
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
                <div className="sidebar-logo">
                    <div>
                        <h1>Tirth Construction</h1>
                        <p>Operations Ledger System</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-title">Main Menu</div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${isActive ? "active" : ""}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="user-badge">
                    <div className="avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.name || "User"}</div>
                        <div className="user-role">{user?.role || "operator"}</div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="btn btn-ghost btn-sm"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>
        </>
    );
}
