"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, Save, Download, Calendar, Users } from "lucide-react";
import { getWorkers } from "@/lib/actions/attendanceActions";
import { bulkMarkAttendance, getAttendanceForDate, getAttendanceHistory } from "@/lib/actions/attendanceActions";
import { getSites } from "@/lib/actions/financialActions";

type Worker = {
    id: string;
    name: string;
    site: { name: string };
    siteId: string;
};

type AttendanceEntry = {
    workerId: string;
    status: string;
    notes: string;
};

type HistoryRecord = {
    id: string;
    date: string;
    status: string;
    notes: string | null;
    worker: { name: string; site: { name: string } };
};

type ViewMode = "daily" | "monthly" | "yearly";

export default function AttendancePage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
    const [siteFilter, setSiteFilter] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // History view
    const [viewMode, setViewMode] = useState<ViewMode>("daily");
    const [selectedMonth, setSelectedMonth] = useState(
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    );
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Generate year options
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

    // Load daily view data
    const loadDaily = useCallback(async () => {
        const [workerList, siteList, existingAttendance] = await Promise.all([
            getWorkers(siteFilter || undefined),
            getSites(),
            getAttendanceForDate(date, siteFilter || undefined),
        ]);

        setWorkers(workerList as unknown as Worker[]);
        setSites(siteList.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));

        const map: Record<string, AttendanceEntry> = {};
        for (const w of workerList) {
            const existing = (existingAttendance as { workerId: string; status: string; notes: string | null }[])
                .find((a) => a.workerId === w.id);
            map[w.id] = {
                workerId: w.id,
                status: existing?.status || "",
                notes: existing?.notes || "",
            };
        }
        setAttendance(map);
        setSaved(false);
    }, [siteFilter, date]);

    // Load history view data
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        let startDate: string;
        let endDate: string;

        if (viewMode === "monthly") {
            const [y, m] = selectedMonth.split("-");
            startDate = `${y}-${m}-01`;
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
            endDate = `${y}-${m}-${lastDay}`;
        } else {
            startDate = `${selectedYear}-01-01`;
            endDate = `${selectedYear}-12-31`;
        }

        const data = await getAttendanceHistory({
            siteId: siteFilter || undefined,
            startDate,
            endDate,
        });
        setHistoryRecords(data as unknown as HistoryRecord[]);
        setHistoryLoading(false);
    }, [viewMode, selectedMonth, selectedYear, siteFilter]);

    useEffect(() => {
        if (viewMode === "daily") {
            loadDaily();
        } else {
            loadHistory();
        }
    }, [viewMode, loadDaily, loadHistory]);

    const setStatus = (workerId: string, status: string) => {
        setAttendance((prev) => ({
            ...prev,
            [workerId]: { ...prev[workerId], status: prev[workerId]?.status === status ? "" : status },
        }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const entries = Object.values(attendance).filter((a) => a.status);
        await bulkMarkAttendance(
            entries.map((a) => ({ workerId: a.workerId, status: a.status, notes: a.notes })),
            date
        );
        setSaving(false);
        setSaved(true);
    };

    // Summary stats for history view
    const presentCount = historyRecords.filter((r) => r.status === "present").length;
    const absentCount = historyRecords.filter((r) => r.status === "absent").length;
    const halfDayCount = historyRecords.filter((r) => r.status === "half-day").length;

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (siteFilter) params.set("siteId", siteFilter);

        if (viewMode === "daily") {
            params.set("startDate", date);
            params.set("endDate", date);
        } else if (viewMode === "monthly") {
            const [y, m] = selectedMonth.split("-");
            params.set("startDate", `${y}-${m}-01`);
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
            params.set("endDate", `${y}-${m}-${lastDay}`);
        } else {
            params.set("startDate", `${selectedYear}-01-01`);
            params.set("endDate", `${selectedYear}-12-31`);
        }
        return `/api/export/attendance?${params.toString()}`;
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h2>Attendance</h2>
                    <p>Mark and manage daily worker attendance</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => { window.location.href = getExportUrl(); }}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    {viewMode === "daily" && (
                        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                            <Save size={16} /> {saving ? "Saving..." : saved ? "Saved ✓" : "Save Attendance"}
                        </button>
                    )}
                </div>
            </div>

            {/* View mode tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {(["daily", "monthly", "yearly"] as ViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        className={`btn btn-sm ${viewMode === mode ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setViewMode(mode)}
                    >
                        {mode === "daily" ? <CalendarCheck size={14} /> : <Calendar size={14} />}
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {viewMode === "daily" && (
                    <div className="form-group">
                        <label>Date</label>
                        <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                )}
                {viewMode === "monthly" && (
                    <div className="form-group">
                        <label>Month</label>
                        <input type="month" className="form-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                    </div>
                )}
                {viewMode === "yearly" && (
                    <div className="form-group">
                        <label>Year</label>
                        <select className="form-input" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
                <div className="form-group">
                    <label>Site</label>
                    <select className="form-input" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
                        <option value="">All Sites</option>
                        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* ======= DAILY VIEW ======= */}
            {viewMode === "daily" && (
                workers.length === 0 ? (
                    <div className="card empty-state">
                        <CalendarCheck size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                        <p>No workers found. Add workers first from the Workers page.</p>
                    </div>
                ) : (
                    <div className="attendance-grid">
                        {workers.map((w) => (
                            <div className="attendance-row" key={w.id}>
                                <div>
                                    <div className="worker-name">{w.name}</div>
                                    <div className="worker-site">{w.site.name}</div>
                                </div>
                                <div className="status-toggle">
                                    <button
                                        className={`status-btn ${attendance[w.id]?.status === "present" ? "active-present" : ""}`}
                                        onClick={() => setStatus(w.id, "present")}
                                        type="button"
                                    >
                                        P
                                    </button>
                                    <button
                                        className={`status-btn ${attendance[w.id]?.status === "absent" ? "active-absent" : ""}`}
                                        onClick={() => setStatus(w.id, "absent")}
                                        type="button"
                                    >
                                        A
                                    </button>
                                    <button
                                        className={`status-btn ${attendance[w.id]?.status === "half-day" ? "active-half-day" : ""}`}
                                        onClick={() => setStatus(w.id, "half-day")}
                                        type="button"
                                    >
                                        H
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ======= MONTHLY / YEARLY VIEW ======= */}
            {viewMode !== "daily" && (
                <>
                    {/* Summary stats */}
                    <div className="stats-grid" style={{ marginBottom: "1rem" }}>
                        <div className="stat-card">
                            <div className="stat-icon green"><Users size={20} /></div>
                            <div>
                                <div className="stat-value" style={{ color: "var(--color-success)" }}>{presentCount}</div>
                                <div className="stat-label">Present</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon red"><Users size={20} /></div>
                            <div>
                                <div className="stat-value" style={{ color: "var(--color-danger)" }}>{absentCount}</div>
                                <div className="stat-label">Absent</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon yellow"><Users size={20} /></div>
                            <div>
                                <div className="stat-value" style={{ color: "var(--color-warning)" }}>{halfDayCount}</div>
                                <div className="stat-label">Half-Day</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><Users size={20} /></div>
                            <div>
                                <div className="stat-value">{historyRecords.length}</div>
                                <div className="stat-label">Total Records</div>
                            </div>
                        </div>
                    </div>

                    {historyLoading ? (
                        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
                    ) : historyRecords.length === 0 ? (
                        <div className="card empty-state">
                            <p>No attendance records for this period.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Worker</th>
                                        <th>Site</th>
                                        <th>Status</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyRecords.map((r) => (
                                        <tr key={r.id}>
                                            <td>{new Date(r.date).toLocaleDateString("en-IN")}</td>
                                            <td style={{ fontWeight: 500 }}>{r.worker.name}</td>
                                            <td>{r.worker.site.name}</td>
                                            <td>
                                                <span className={`badge badge-${r.status}`}>{r.status}</span>
                                            </td>
                                            <td style={{ color: "var(--color-text-muted)" }}>{r.notes || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
