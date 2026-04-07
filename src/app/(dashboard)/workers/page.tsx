"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Eye } from "lucide-react";
import { createWorker, getWorkers, deactivateWorker } from "@/lib/actions/attendanceActions";
import { getSites } from "@/lib/actions/financialActions";

type Worker = {
    id: string;
    name: string;
    phone: string | null;
    wage: number | null;
};

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const w = await getWorkers();
        setWorkers(w as unknown as Worker[]);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await createWorker(formData);
        setShowModal(false);
        load();
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm("Are you sure you want to remove this worker?")) return;
        await deactivateWorker(id);
        load();
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Workers</h2>
                    <p>Manage your workforce across all sites</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Worker
                </button>
            </div>

            {loading ? (
                <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
            ) : workers.length === 0 ? (
                <div className="card empty-state">
                    <Users size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                    <p>No workers added yet</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        <Plus size={14} /> Add First Worker
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th style={{ textAlign: "right" }}>Daily Wage</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((w) => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 500 }}>{w.name}</td>
                                    <td style={{ color: "var(--color-text-muted)" }}>{w.phone || "—"}</td>
                                    <td style={{ textAlign: "right" }}>
                                        {w.wage ? `₹${w.wage.toLocaleString("en-IN")}` : "—"}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                                            <Link href={`/workers/${w.id}`} className="btn btn-ghost btn-sm">
                                                <Eye size={14} /> Details
                                            </Link>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(w.id)}>
                                                Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Add Worker</h3>
                        <form onSubmit={handleCreate}>
                                <div className="form-group">
                                    <label>Worker Name *</label>
                                    <input name="name" className="form-input" placeholder="Full name" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input name="phone" className="form-input" placeholder="Optional" />
                                    </div>
                                    <div className="form-group">
                                        <label>Daily Wage (₹)</label>
                                        <input name="wage" type="number" className="form-input" placeholder="Optional" />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Worker</button>
                                </div>
                            </form>
                    </div>
                </div>
            )}
        </div>
    );
}
