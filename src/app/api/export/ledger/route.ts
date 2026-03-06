import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const keyword = searchParams.get("keyword") || undefined;

    const where: Record<string, unknown> = { isDeleted: false };
    if (siteId) where.siteId = siteId;
    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }
    if (keyword) {
        where.description = { contains: keyword };
    }

    const transactions = await prisma.transaction.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { date: "desc" },
    });

    // Build CSV
    const header = "Date,Site,Description,Cash In,Cash Out,Net Value";
    const rows = transactions.map((t) => {
        const date = new Date(t.date).toLocaleDateString("en-IN");
        const site = t.site.name.replace(/,/g, " ");
        const desc = t.description.replace(/,/g, " ");
        return `${date},${site},${desc},${t.cashIn},${t.cashOut},${t.netValue}`;
    });

    const totalIn = transactions.reduce((s, t) => s + t.cashIn, 0);
    const totalOut = transactions.reduce((s, t) => s + t.cashOut, 0);
    rows.push(`,,TOTAL,${totalIn},${totalOut},${totalIn - totalOut}`);

    const csv = [header, ...rows].join("\n");
    const filename = `ledger_export_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
