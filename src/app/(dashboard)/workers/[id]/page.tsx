"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, IndianRupee, Calendar, Users } from "lucide-react";
import {
    getWorkerWageSummary,
    createDeduction,
    deleteDeduction,
} from "@/lib/actions/attendanceActions";

type Deduction = {
    id: string;
    date: string;
    amount: number;
    reason: string | null;
};

type WorkerWageSummary = {
    worker: {
        id: string;
        name: string;
        phone: string | null;
        wage: number;
        site: { name: string };
    };
    presentDays: number;
    halfDays: number;
    absentDays: number;
    effectiveDays: number;
    grossAmount: number;
    deductions: Deduction[];
    totalDeductions: number;
    netPayable: number;
};

export default function WorkerDetailPage() {
    const params = useParams();
    const workerId = params.id as string;

    const now = new Date();
    const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
    const [selectedMonth, setSelectedMonth] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
    const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
    const [summary, setSummary] = useState<WorkerWageSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeductionModal, setShowDeductionModal] = useState(false);

    const yearOptions = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

    const getDateRange = useCallback(() => {
        if (viewMode === "monthly") {
            const [y, m] = selectedMonth.split("-");
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
            return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
        }
        return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
    }, [viewMode, selectedMonth, selectedYear]);

    const load = useCallback(async () => {
        setLoading(true);
        const { start, end } = getDateRange();
        const data = await getWorkerWageSummary(workerId, start, end);
        setSummary(data as unknown as WorkerWageSummary);
        setLoading(false);
    }, [workerId, getDateRange]);

    useEffect(() => { load(); }, [load]);

    const handleAddDeduction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const amount = parseFloat(formData.get("amount") as string);
        const date = formData.get("date") as string;
        const reason = (formData.get("reason") as string) || undefined;
        await createDeduction(workerId, amount, date, reason);
        setShowDeductionModal(false);
        load();
    };

    const handleDeleteDeduction = async (id: string) => {
        if (!confirm("Remove this deduction?")) return;
        await deleteDeduction(id);
        load();
    };

    const fmt = (val: number) => "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

    if (loading) return <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>;
    if (!summary) return <p style={{ color: "var(--color-text-muted)" }}>Worker not found.</p>;

    const { worker } = summary;

    return (
        <div className="animate-in">
            <Link href="/workers" className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>
                <ArrowLeft size={14} /> Back to Workers
            </Link>

            <div className="page-header">
                <div>
                    <h2>{worker.name}</h2>
                    <p>
                        {worker.site.name} · Daily Wage: <strong>{fmt(worker.wage)}</strong>
                        {worker.phone && <> · Phone: {worker.phone}</>}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowDeductionModal(true)}>
                    <Plus size={16} /> Add Deduction
                </button>
            </div>

            {/* Period Selector */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "end" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        className={`btn btn-sm ${viewMode === "monthly" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setViewMode("monthly")}
                    >
                        <Calendar size={14} /> Monthly
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === "yearly" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setViewMode("yearly")}
                    >
                        <Calendar size={14} /> Yearly
                    </button>
                </div>
                {viewMode === "monthly" ? (
                    <input
                        type="month"
                        className="form-input"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ maxWidth: "200px" }}
                    />
                ) : (
                    <select
                        className="form-input"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ maxWidth: "150px" }}
                    >
                        {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}
            </div>

            {/* Wage Calculation Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon green"><Users size={20} /></div>
                    <div>
                        <div className="stat-value" style={{ color: "var(--color-success)" }}>
                            {summary.presentDays} <span style={{ fontSize: "0.7rem", fontWeight: 400 }}>+ {summary.halfDays} half</span>
                        </div>
                        <div className="stat-label">Present Days ({summary.effectiveDays} effective)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><IndianRupee size={20} /></div>
                    <div>
                        <div className="stat-value amount-in">{fmt(summary.grossAmount)}</div>
                        <div className="stat-label">Gross Earnings</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><IndianRupee size={20} /></div>
                    <div>
                        <div className="stat-value amount-out">{fmt(summary.totalDeductions)}</div>
                        <div className="stat-label">Total Deductions</div>
                    </div>
                </div>
                <div className="stat-card" style={{ border: "1px solid var(--color-primary)" }}>
                    <div className="stat-icon cyan"><IndianRupee size={20} /></div>
                    <div>
                        <div className="stat-value amount-net" style={{ fontSize: "1.5rem" }}>{fmt(summary.netPayable)}</div>
                        <div className="stat-label" style={{ fontWeight: 600 }}>NET PAYABLE</div>
                    </div>
                </div>
            </div>

            {/* Deductions Table */}
            <div className="card" style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
                    Deductions / Advances ({summary.deductions.length})
                </h3>

                {summary.deductions.length === 0 ? (
                    <div className="empty-state">
                        <p>No deductions recorded for this period.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reason</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.deductions.map((d) => (
                                    <tr key={d.id}>
                                        <td>{new Date(d.date).toLocaleDateString("en-IN")}</td>
                                        <td>{d.reason || "—"}</td>
                                        <td style={{ textAlign: "right" }} className="amount-out">{fmt(d.amount)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDeduction(d.id)}>
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

            {/* Summary Formula */}
            <div className="card" style={{ marginTop: "1rem", background: "var(--color-surface)", padding: "1rem" }}>
                <p style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                    <strong>Formula:</strong> ({summary.effectiveDays} days × {fmt(worker.wage)}/day) − {fmt(summary.totalDeductions)} deductions = <strong style={{ color: "var(--color-primary)" }}>{fmt(summary.netPayable)}</strong>
                </p>
            </div>

            {/* Add Deduction Modal */}
            {showDeductionModal && (
                <div className="modal-overlay" onClick={() => setShowDeductionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Add Deduction / Advance</h3>
                        <form onSubmit={handleAddDeduction}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input name="date" type="date" className="form-input" defaultValue={new Date().toISOString().split("T")[0]} required />
                                </div>
                                <div className="form-group">
                                    <label>Amount (₹) *</label>
                                    <input name="amount" type="number" step="0.01" className="form-input" placeholder="e.g. 500" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Reason</label>
                                <input name="reason" className="form-input" placeholder="e.g. Advance payment, Tea expense" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowDeductionModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Deduction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
