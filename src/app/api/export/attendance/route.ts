import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security";

type AttendanceRecord = {
  date: Date;
  status: string;
  notes: string | null;
  worker: { id: string; name: string; wage: number | null };
  site: { name: string };
};

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-IN");
}

function formatStatus(status: string) {
  if (status === "half-day") return "Half-Day";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function GET(req: NextRequest) {
  await requireUser();

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
      worker: { select: { id: true, name: true, wage: true } },
      site: { select: { name: true } },
    },
    orderBy: [{ worker: { name: "asc" } }, { date: "asc" }],
  });

  const workerIds = [...new Set(records.map((record) => record.worker.id))];
  const deductionWhere: Record<string, unknown> = {
    workerId: { in: workerIds },
  };

  if (startDate || endDate) {
    deductionWhere.date = {};
    if (startDate) (deductionWhere.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (deductionWhere.date as Record<string, unknown>).lte = new Date(endDate);
  }

  const deductions = workerIds.length === 0
    ? []
    : await prisma.deduction.findMany({
        where: deductionWhere,
        select: { workerId: true, amount: true },
      });

  const deductionMap = new Map<string, number>();
  for (const deduction of deductions) {
    deductionMap.set(
      deduction.workerId,
      (deductionMap.get(deduction.workerId) || 0) + deduction.amount,
    );
  }

  let siteName = "All Sites";
  if (siteId) {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (site) siteName = site.name;
  }

  let workerName = "All Workers";
  if (workerId) {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (worker) workerName = worker.name;
  }

  const startStr = startDate ? formatDate(new Date(startDate)) : "Start";
  const endStr = endDate ? formatDate(new Date(endDate)) : "End";
  const safeSiteName = siteName.replace(/[<>:"/\\|?*]/g, "");
  const safeWorkerName = workerName.replace(/[<>:"/\\|?*]/g, "");
  const filename = `Attendance - ${safeSiteName} - ${safeWorkerName} - ${startStr} to ${endStr}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Worker", key: "worker", width: 28 },
    { header: "Status", key: "status", width: 16 },
    { header: "Site", key: "site", width: 28 },
    { header: "Remarks", key: "remarks", width: 42, style: { alignment: { wrapText: true } } },
  ];

  const titleRow = sheet.addRow(["Attendance Report"]);
  sheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
  titleRow.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  titleRow.alignment = { horizontal: "center", vertical: "middle" };
  titleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };

  const metaRow = sheet.addRow([`Site: ${siteName}    Worker: ${workerName}    Period: ${startStr} to ${endStr}`]);
  sheet.mergeCells(`A${metaRow.number}:E${metaRow.number}`);
  metaRow.font = { italic: true, color: { argb: "FF475569" } };
  metaRow.alignment = { horizontal: "left" };

  const spacerRow = sheet.addRow([]);
  void spacerRow;

  const summaryHeader = sheet.addRow(["Summary"]);
  sheet.mergeCells(`A${summaryHeader.number}:E${summaryHeader.number}`);
  summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  summaryHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF334155" },
  };

  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.filter((record) => record.status === "absent").length;
  const halfDayCount = records.filter((record) => record.status === "half-day").length;

  sheet.addRow(["Present", presentCount]);
  sheet.addRow(["Absent", absentCount]);
  sheet.addRow(["Half-Day", halfDayCount]);
  sheet.addRow(["Total Records", records.length]);
  sheet.addRow(["Total Deductions", deductions.reduce((sum, deduction) => sum + deduction.amount, 0)]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["Date", "Worker", "Status", "Site", "Remarks"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };

  const typedRecords = records as AttendanceRecord[];
  typedRecords.forEach((record) => {
    sheet.addRow([
      formatDate(record.date),
      record.worker.name,
      formatStatus(record.status),
      record.site.name,
      record.notes || "-",
    ]);
  });

  sheet.addRow([]);

  const groupedHeader = sheet.addRow(["Worker-wise Attendance"]);
  sheet.mergeCells(`A${groupedHeader.number}:E${groupedHeader.number}`);
  groupedHeader.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  groupedHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF334155" },
  };

  const workerMap = new Map<string, AttendanceRecord[]>();
  for (const record of typedRecords) {
    const existing = workerMap.get(record.worker.id) || [];
    existing.push(record);
    workerMap.set(record.worker.id, existing);
  }

  for (const [workerId, workerRecords] of workerMap.entries()) {
    const worker = workerRecords[0]?.worker;
    const name = worker?.name || "Unknown Worker";
    const dailyWage = worker?.wage || 0;
    const workerPresentCount = workerRecords.filter((record) => record.status === "present").length;
    const workerAbsentCount = workerRecords.filter((record) => record.status === "absent").length;
    const workerHalfDayCount = workerRecords.filter((record) => record.status === "half-day").length;
    const totalDeduction = deductionMap.get(workerId) || 0;
    const netPayable = (dailyWage * workerPresentCount) - totalDeduction;

    sheet.addRow([]);

    const workerSectionRow = sheet.addRow([name]);
    sheet.mergeCells(`A${workerSectionRow.number}:E${workerSectionRow.number}`);
    workerSectionRow.font = { bold: true, color: { argb: "FF0F172A" } };
    workerSectionRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    const workerHeaderRow = sheet.addRow(["Date", "Worker", "Status", "Site", "Remarks"]);
    workerHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    workerHeaderRow.alignment = { vertical: "middle", horizontal: "center" };
    workerHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF475569" },
    };

    workerRecords.forEach((record) => {
      sheet.addRow([
        formatDate(record.date),
        record.worker.name,
        formatStatus(record.status),
        record.site.name,
        record.notes || "-",
      ]);
    });

    const summaryLabelRow = sheet.addRow(["Worker Summary"]);
    sheet.mergeCells(`A${summaryLabelRow.number}:E${summaryLabelRow.number}`);
    summaryLabelRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    summaryLabelRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF64748B" },
    };

    sheet.addRow([
      `Present: ${workerPresentCount}`,
      `Absent: ${workerAbsentCount}`,
      `Half-Day: ${workerHalfDayCount}`,
      `Daily Wage: Rs. ${dailyWage.toLocaleString("en-IN")}`,
      `Deductions: Rs. ${totalDeduction.toLocaleString("en-IN")}`,
    ]);

    const netPayableRow = sheet.addRow([
      "Net Payable",
      "",
      "",
      "",
      `Rs. ${netPayable.toLocaleString("en-IN")}`,
    ]);
    netPayableRow.font = { bold: true };
    netPayableRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    netPayableRow.getCell(5).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCFCE7" },
    };
  }

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (rowNumber > 0) {
        cell.alignment = {
          ...cell.alignment,
          vertical: "middle",
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
