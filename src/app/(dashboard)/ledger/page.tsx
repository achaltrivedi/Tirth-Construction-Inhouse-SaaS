"use client";

import { useEffect, useState } from "react";
import { getMasterLedger } from "@/lib/actions/financialActions";
import { getSites } from "@/lib/actions/financialActions";
import { Search, Filter, Download } from "lucide-react";

type LedgerEntry = {
    id: string;
    date: string;
    description: string;
    cashIn: number;
    cashOut: number;
    netValue: number;
    addedBy: string | null;
    site: { name: string };
};

type SiteOption = { id: string; name: string };

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [sites, setSites] = useState<SiteOption[]>([]);
    const [siteId, setSiteId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async (filters?: {
        siteId?: string;
        startDate?: string;
        endDate?: string;
        keyword?: string;
    }) => {
        setLoading(true);
        const [data, siteList] = await Promise.all([
            getMasterLedger(filters),
            getSites(),
        ]);
        setEntries(data as unknown as LedgerEntry[]);
        setSites(siteList.map((s) => ({ id: s.id, name: s.name })));
        setLoading(false);
    };

    useEffect(() => {
        let active = true;

        void (async () => {
            const [data, siteList] = await Promise.all([
                getMasterLedger(),
                getSites(),
            ]);

            if (!active) return;

            setEntries(data as unknown as LedgerEntry[]);
            setSites(siteList.map((s) => ({ id: s.id, name: s.name })));
            setLoading(false);
        })();

        return () => {
            active = false;
        };
    }, []);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        void load({
            siteId: siteId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            keyword: keyword || undefined,
        });
    };

    const fmt = (val: number) => "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

    const totalIn = entries.reduce((s, e) => s + e.cashIn, 0);
    const totalOut = entries.reduce((s, e) => s + e.cashOut, 0);

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Master Ledger</h2>
                    <p>All financial entries across sites</p>
                </div>
                <button
                    className="btn btn-ghost"
                    onClick={() => {
                        const params = new URLSearchParams();
                        if (siteId) params.set("siteId", siteId);
                        if (startDate) params.set("startDate", startDate);
                        if (endDate) params.set("endDate", endDate);
                        if (keyword) params.set("keyword", keyword);
                        window.location.href = `/api/export/ledger?${params.toString()}`;
                    }}
                >
                    <Download size={16} /> Export to Excel
                </button>
            </div>

            <form className="filter-bar" onSubmit={handleFilter}>
                <div className="form-group">
                    <label>Site</label>
                    <select className="form-input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                        <option value="">All Sites</option>
                        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>From</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>To</label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Search</label>
                    <input className="form-input" placeholder="Keyword..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                    <Filter size={14} /> Apply
                </button>
            </form>

            <div className="stats-grid" style={{ marginBottom: "1rem" }}>
                <div className="stat-card">
                    <div className="stat-icon green"><Search size={20} /></div>
                    <div>
                        <div className="stat-value amount-in">{fmt(totalIn)}</div>
                        <div className="stat-label">Filtered Cash In</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><Search size={20} /></div>
                    <div>
                        <div className="stat-value amount-out">{fmt(totalOut)}</div>
                        <div className="stat-label">Filtered Cash Out</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan"><Search size={20} /></div>
                    <div>
                        <div className="stat-value amount-net">{fmt(totalIn - totalOut)}</div>
                        <div className="stat-label">Net Position</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
            ) : entries.length === 0 ? (
                <div className="card empty-state">
                    <p>No entries found for the selected filters.</p>
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
                            {entries.map((e) => (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString("en-IN")}</td>
                                    <td>{e.site.name}</td>
                                    <td>{e.description}</td>
                                    <td style={{ textAlign: "right" }} className="amount-in">
                                        {e.cashIn > 0 ? fmt(e.cashIn) : "—"}
                                    </td>
                                    <td style={{ textAlign: "right" }} className="amount-out">
                                        {e.cashOut > 0 ? fmt(e.cashOut) : "—"}
                                    </td>
                                    <td style={{ textAlign: "right" }} className="amount-net">
                                        {fmt(e.netValue)}
                                    </td>
                                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{e.addedBy || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
