"use client";

import { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { createWorker, getWorkers, deactivateWorker } from "@/lib/actions/attendanceActions";
import { getSites } from "@/lib/actions/financialActions";

type Worker = {
    id: string;
    name: string;
    phone: string | null;
    wage: number | null;
    siteId: string;
    site: { name: string };
};

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const [w, s] = await Promise.all([getWorkers(), getSites()]);
        setWorkers(w as unknown as Worker[]);
        setSites(s.map((site) => ({ id: site.id, name: site.name })));
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
                                <th>Site</th>
                                <th style={{ textAlign: "right" }}>Daily Wage</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((w) => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 500 }}>{w.name}</td>
                                    <td style={{ color: "var(--color-text-muted)" }}>{w.phone || "—"}</td>
                                    <td><span className="badge badge-active">{w.site.name}</span></td>
                                    <td style={{ textAlign: "right" }}>
                                        {w.wage ? `₹${w.wage.toLocaleString("en-IN")}` : "—"}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(w.id)}>
                                            Remove
                                        </button>
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
                        {sites.length === 0 ? (
                            <div className="empty-state">
                                <p>You need to create a site first before adding workers.</p>
                            </div>
                        ) : (
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
                                <div className="form-group">
                                    <label>Assigned Site *</label>
                                    <select name="siteId" className="form-input" required>
                                        <option value="">Select a site</option>
                                        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Add Worker</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
