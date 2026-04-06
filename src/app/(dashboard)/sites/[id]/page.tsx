"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, IndianRupee } from "lucide-react";
import {
    getSiteById,
    getSiteSummary,
    createTransaction,
    softDeleteTransaction,
    updateSiteStatus,
} from "@/lib/actions/financialActions";

type Transaction = {
    id: string;
    date: string;
    description: string;
    cashIn: number;
    cashOut: number;
    netValue: number;
    addedBy: string | null;
};

type SiteData = {
    id: string;
    name: string;
    clientName: string;
    projectType: string;
    contractValue: string | null;
    startDate: string;
    status: string;
    transactions: Transaction[];
};

type SiteSummaryData = {
    totalCashIn: number;
    totalCashOut: number;
    netPosition: number;
    count: number;
};

export default function SiteDetailPage() {
    const params = useParams();
    const siteId = params.id as string;
    const { data: session } = useSession();
    const userId = (session?.user as { id?: string })?.id || "";
    const userName = (session?.user as { name?: string })?.name || "Unknown";

    const [site, setSite] = useState<SiteData | null>(null);
    const [summary, setSummary] = useState<SiteSummaryData | null>(null);
    const [showModal, setShowModal] = useState(false);

    const load = useCallback(async () => {
        const [s, sum] = await Promise.all([
            getSiteById(siteId),
            getSiteSummary(siteId),
        ]);
        setSite(s as unknown as SiteData);
        setSummary(sum);
    }, [siteId]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set("siteId", siteId);
        await createTransaction(formData, userId, userName);
        setShowModal(false);
        load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this entry? (soft-delete)")) return;
        await softDeleteTransaction(id, userId);
        load();
    };

    const handleStatusChange = async (newStatus: string) => {
        await updateSiteStatus(siteId, newStatus);
        load();
    };

    const nextStatus = (current: string) => {
        const STATUS_OPTIONS = ["active", "completed", "on-hold"];
        const idx = STATUS_OPTIONS.indexOf(current);
        return STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];
    };


    const fmt = (val: number) => "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

    if (!site) return <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>;

    return (
        <div className="animate-in">
            <Link href="/sites" className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>
                <ArrowLeft size={14} /> Back to Sites
            </Link>

            <div className="page-header">
                <div>
                    <h2>{site.name}</h2>
                    <p>
                        {site.clientName} · {site.projectType} ·{" "}
                        <button
                            className={`badge badge-${site.status}`}
                            onClick={() => handleStatusChange(nextStatus(site.status))}
                            style={{ cursor: "pointer", border: "none", transition: "all 0.15s ease", verticalAlign: "baseline" }}
                            title={`Click to change status (Currently: ${site.status.charAt(0).toUpperCase() + site.status.slice(1)})`}
                        >
                            {site.status}
                        </button>
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Entry
                </button>
            </div>

            {summary && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon green"><IndianRupee size={24} /></div>
                        <div>
                            <div className="stat-value amount-in">{fmt(summary.totalCashIn)}</div>
                            <div className="stat-label">Total Cash In</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red"><IndianRupee size={24} /></div>
                        <div>
                            <div className="stat-value amount-out">{fmt(summary.totalCashOut)}</div>
                            <div className="stat-label">Total Cash Out</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon cyan"><IndianRupee size={24} /></div>
                        <div>
                            <div className="stat-value amount-net">{fmt(summary.netPosition)}</div>
                            <div className="stat-label">Net Position</div>
                        </div>
                    </div>
                    {site.contractValue && (
                        <div className="stat-card">
                            <div className="stat-icon yellow"><IndianRupee size={24} /></div>
                            <div>
                                <div className="stat-value" style={{ color: "var(--color-warning)" }}>{site.contractValue}</div>
                                <div className="stat-label">Contract Value</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="card">
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Transactions ({summary?.count || 0})</h3>

                {site.transactions.length === 0 ? (
                    <div className="empty-state">
                        <p>No transactions yet for this site.</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={14} /> Add First Entry
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: "right" }}>Cash In</th>
                                    <th style={{ textAlign: "right" }}>Cash Out</th>
                                    <th style={{ textAlign: "right" }}>Net</th>
                                    <th>Added By</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {site.transactions.map((t) => (
                                    <tr key={t.id}>
                                        <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                                        <td>{t.description}</td>
                                        <td style={{ textAlign: "right" }} className="amount-in">
                                            {t.cashIn > 0 ? fmt(t.cashIn) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right" }} className="amount-out">
                                            {t.cashOut > 0 ? fmt(t.cashOut) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right" }} className="amount-net">
                                            {fmt(t.netValue)}
                                        </td>
                                        <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{t.addedBy || "—"}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Add Financial Entry</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input name="date" type="date" className="form-input" defaultValue={new Date().toISOString().split("T")[0]} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <input name="description" className="form-input" placeholder="e.g. Cement purchased, Labour payment" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cash In (₹)</label>
                                    <input name="cashIn" type="number" step="0.01" className="form-input" placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label>Cash Out (₹)</label>
                                    <input name="cashOut" type="number" step="0.01" className="form-input" placeholder="0" />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-success">Add Entry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
