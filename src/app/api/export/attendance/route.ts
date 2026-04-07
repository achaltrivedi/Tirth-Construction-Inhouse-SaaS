import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const workerId = searchParams.get("workerId") || undefined;

    const where: Record<string, unknown> = {};
    if (workerId) where.workerId = workerId;
    if (siteId) where.siteId = siteId;
    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const records = await prisma.attendance.findMany({
        where,
        include: {
            site: { select: { name: true } },
            worker: { select: { name: true } },
        },
        orderBy: { date: "desc" },
    });

    // Build CSV
    const header = "Date,Worker,Site,Status,Notes,Marked By";
    const rows = records.map((r: any) => {
        const date = new Date(r.date).toLocaleDateString("en-IN");
        const worker = r.worker.name.replace(/,/g, " ");
        const site = r.site.name.replace(/,/g, " ");
        const notes = (r.notes || "").replace(/,/g, " ");
        const markedBy = (r.markedBy || "").replace(/,/g, " ");
        return `${date},${worker},${site},${r.status},${notes},${markedBy}`;
    });

    // Summary counts
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const halfDay = records.filter((r) => r.status === "half-day").length;
    rows.push("");
    rows.push(`Summary,Present: ${present},Absent: ${absent},Half-day: ${halfDay},Total: ${records.length}`);

    const csv = [header, ...rows].join("\n");
    const filename = `attendance_export_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
