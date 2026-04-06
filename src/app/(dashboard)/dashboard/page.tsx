import { prisma } from "@/lib/db";
import Link from "next/link";
import { Building2, IndianRupee, Users, CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const [siteCount, transactionAgg, workerCount, todayAttendance] =
        await Promise.all([
            prisma.site.count(),
            prisma.transaction.aggregate({
                where: { isDeleted: false },
                _sum: { cashIn: true, cashOut: true },
                _count: true,
            }),
            prisma.worker.count({ where: { isActive: true } }),
            prisma.attendance.count({
                where: {
                    date: new Date(new Date().toISOString().split("T")[0]),
                    status: "present",
                },
            }),
        ]);

    const totalCashIn = transactionAgg._sum.cashIn || 0;
    const totalCashOut = transactionAgg._sum.cashOut || 0;
    const netPosition = totalCashIn - totalCashOut;

    const recentTransactions = await prisma.transaction.findMany({
        where: { isDeleted: false },
        select: {
            id: true,
            date: true,
            description: true,
            cashIn: true,
            cashOut: true,
            netValue: true,
            addedBy: true,
            createdAt: true,
            site: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    const formatCurrency = (val: number) =>
        "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Dashboard</h2>
                    <p>Overview of all operations</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{siteCount}</div>
                        <div className="stat-label">Total Sites</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <div className="stat-value amount-in">{formatCurrency(totalCashIn)}</div>
                        <div className="stat-label">Total Cash In</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon red">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <div className="stat-value amount-out">{formatCurrency(totalCashOut)}</div>
                        <div className="stat-label">Total Cash Out</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon cyan">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <div className="stat-value amount-net">{formatCurrency(netPosition)}</div>
                        <div className="stat-label">Net Position</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{workerCount}</div>
                        <div className="stat-label">Active Workers</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <CalendarCheck size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{todayAttendance}</div>
                        <div className="stat-label">Present Today</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Recent Transactions</h3>
                    <Link href="/ledger" className="btn btn-ghost btn-sm">
                        View All
                    </Link>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="empty-state">
                        <p>No transactions yet. Start by creating a site and adding entries.</p>
                        <Link href="/sites" className="btn btn-primary btn-sm">
                            Create Site
                        </Link>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Site</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: "right" }}>Cash In</th>
                                    <th style={{ textAlign: "right" }}>Cash Out</th>
                                    <th style={{ textAlign: "right" }}>Net</th>
                                    <th>Added By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((t) => (
                                    <tr key={t.id}>
                                        <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                                        <td>{t.site.name}</td>
                                        <td>{t.description}</td>
                                        <td style={{ textAlign: "right" }} className="amount-in">
                                            {t.cashIn > 0 ? formatCurrency(t.cashIn) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right" }} className="amount-out">
                                            {t.cashOut > 0 ? formatCurrency(t.cashOut) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right" }} className="amount-net">
                                            {formatCurrency(t.netValue)}
                                        </td>
                                        <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{t.addedBy || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
