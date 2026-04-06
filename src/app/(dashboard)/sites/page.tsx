"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Building2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { createSite, getSites, updateSiteStatus } from "@/lib/actions/financialActions";

type Site = {
    id: string;
    name: string;
    clientName: string;
    projectType: string;
    contractValue: string | null;
    startDate: string;
    status: string;
    _count: { transactions: number };
};

const ITEMS_PER_PAGE = 12;
const STATUS_OPTIONS = ["active", "completed", "on-hold"];

export default function SitesPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");

    const loadSites = async () => {
        const data = await getSites();
        setSites(data as unknown as Site[]);
        setLoading(false);
    };

    useEffect(() => { loadSites(); }, []);

    // Filter + paginate
    const filtered = useMemo(() => {
        if (!statusFilter) return sites;
        return sites.filter((s) => s.status === statusFilter);
    }, [sites, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filter changes
    useEffect(() => { setCurrentPage(1); }, [statusFilter]);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await createSite(formData);
        setShowModal(false);
        loadSites();
    };

    const handleStatusChange = async (siteId: string, newStatus: string, e: React.MouseEvent) => {
        e.preventDefault(); // prevent navigating to the site detail page
        e.stopPropagation();
        await updateSiteStatus(siteId, newStatus);
        loadSites();
    };

    const nextStatus = (current: string) => {
        const idx = STATUS_OPTIONS.indexOf(current);
        return STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Sites</h2>
                    <p>Manage all your construction sites ({filtered.length} total)</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> New Site
                </button>
            </div>

            {/* Status filter tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <button
                    className={`btn btn-sm ${!statusFilter ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setStatusFilter("")}
                >
                    All ({sites.length})
                </button>
                {STATUS_OPTIONS.map((s) => (
                    <button
                        key={s}
                        className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setStatusFilter(s)}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)} ({sites.filter((site) => site.status === s).length})
                    </button>
                ))}
            </div>

            {loading ? (
                <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
            ) : filtered.length === 0 ? (
                <div className="card empty-state">
                    <Building2 size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                    <p>{statusFilter ? `No ${statusFilter} sites` : "No sites created yet"}</p>
                    {!statusFilter && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={14} /> Create First Site
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
                        {paginated.map((site) => (
                            <Link href={`/sites/${site.id}`} key={site.id} style={{ textDecoration: "none", color: "inherit" }}>
                                <div className="card" style={{ cursor: "pointer" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                        <div>
                                            <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>{site.name}</h3>
                                            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                {site.clientName} · {site.projectType}
                                            </p>
                                        </div>
                                        <button
                                            className={`badge badge-${site.status}`}
                                            onClick={(e) => handleStatusChange(site.id, nextStatus(site.status), e)}
                                            style={{ cursor: "pointer", border: "none", transition: "all 0.15s ease" }}
                                            title={`Click to change to "${nextStatus(site.status)}"`}
                                        >
                                            {site.status}
                                        </button>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                        <span>{site._count.transactions} entries</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-primary-light)" }}>
                                            View <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "2rem" }}>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Site</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Site Name *</label>
                                <input name="name" className="form-input" placeholder="e.g. Villa Project - Gomti Nagar" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Client Name *</label>
                                    <input name="clientName" className="form-input" placeholder="Client name" required />
                                </div>
                                <div className="form-group">
                                    <label>Project Type *</label>
                                    <select name="projectType" className="form-input" required>
                                        <option value="residential">Residential</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="industrial">Industrial</option>
                                        <option value="renovation">Renovation</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Contract Value</label>
                                    <input name="contractValue" type="text" className="form-input" placeholder="e.g. 50 Lacs or 2 Crores" />
                                </div>
                                <div className="form-group">
                                    <label>Start Date *</label>
                                    <input name="startDate" type="date" className="form-input" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" className="form-input">
                                    <option value="active">Active</option>
                                    <option value="on-hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Site</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
