import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
    await requireUser();

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
        orderBy: { date: "asc" }, // Usually asc is better for ledgers visually
    });

    let siteName = "All Sites";
    if (siteId) {
        const site = await prisma.site.findUnique({ where: { id: siteId } });
        if (site) siteName = site.name;
    }

    const startStr = startDate ? new Date(startDate).toLocaleDateString("en-IN") : "Start";
    const endStr = endDate ? new Date(endDate).toLocaleDateString("en-IN") : "End";
    
    // Clean filename characters
    const safeSiteName = siteName.replace(/[<>:"/\\|?*]/g, "");
    const filename = `${safeSiteName} - ${startStr} to ${endStr}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Master Ledger");

    // Add columns
    sheet.columns = [
        { header: "Sr.No", key: "srno", width: 8, style: { alignment: { horizontal: "center" } } },
        { header: "Date", key: "date", width: 15 },
        { header: "Description", key: "description", width: 50, style: { alignment: { wrapText: true } } },
        { header: "Cash In", key: "cashIn", width: 18, style: { numFmt: '"₹"#,##0.00' } },
        { header: "Cash Out", key: "cashOut", width: 18, style: { numFmt: '"₹"#,##0.00' } },
        { header: "Added By", key: "addedBy", width: 25 },
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // dark slate
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add transaction rows
    transactions.forEach((t, i) => {
        const descText = siteId ? t.description : `[${t.site.name}] ${t.description}`;
        sheet.addRow({
            srno: i + 1,
            date: new Date(t.date).toLocaleDateString("en-IN"),
            description: descText,
            cashIn: t.cashIn || 0,
            cashOut: t.cashOut || 0,
            addedBy: t.addedBy || "—",
        });
    });

    // Add Totals Formula Row
    const lastDataRow = transactions.length > 0 ? transactions.length + 1 : 2;
    const totalsRowIndex = lastDataRow + 1;

    const totalRow = sheet.addRow({
        description: "TOTAL",
    });

    // We assign formulas
    totalRow.getCell("cashIn").value = { formula: `SUM(D2:D${lastDataRow})`, date1904: false };
    totalRow.getCell("cashOut").value = { formula: `SUM(E2:E${lastDataRow})`, date1904: false };
    
    // Net total in the next column (Added By column) just to show the math clearly
    totalRow.getCell("addedBy").value = { formula: `D${totalsRowIndex}-E${totalsRowIndex}`, date1904: false };
    totalRow.getCell("addedBy").numFmt = '"₹"#,##0.00';

    // Style totals row
    totalRow.font = { bold: true };
    totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" }, // light grey
    };
    totalRow.getCell("description").alignment = { horizontal: "right" };

    // ===== USER-WISE BREAKDOWN =====
    // Blank separator row
    sheet.addRow({});

    // Section header
    const breakdownHeader = sheet.addRow({ description: "User-wise Breakdown" });
    breakdownHeader.font = { bold: true, size: 11 };
    breakdownHeader.getCell("description").alignment = { horizontal: "left" };

    // Sub-header row
    const subHeader = sheet.addRow({
        description: "User",
        cashIn: "Cash In" as unknown as number,
        cashOut: "Cash Out" as unknown as number,
    });
    subHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    subHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF334155" },
    };

    // Group transactions by addedBy
    const userMap = new Map<string, { cashIn: number; cashOut: number }>();
    for (const t of transactions) {
        const user = t.addedBy || "Unknown";
        const existing = userMap.get(user) || { cashIn: 0, cashOut: 0 };
        existing.cashIn += t.cashIn;
        existing.cashOut += t.cashOut;
        userMap.set(user, existing);
    }

    for (const [user, totals] of userMap.entries()) {
        const userRow = sheet.addRow({
            description: user,
            cashIn: totals.cashIn,
            cashOut: totals.cashOut,
        });
        userRow.getCell("cashIn").numFmt = '"₹"#,##0.00';
        userRow.getCell("cashOut").numFmt = '"₹"#,##0.00';
    }

    // Render file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
