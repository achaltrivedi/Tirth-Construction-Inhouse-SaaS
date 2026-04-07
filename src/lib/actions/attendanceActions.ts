"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============ WORKER ACTIONS ============

export async function createWorker(formData: FormData) {
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;
    const wage = formData.get("wage")
        ? parseFloat(formData.get("wage") as string)
        : null;

    await prisma.worker.create({
        data: { name, phone, wage },
    });

    revalidatePath("/attendance");
    revalidatePath("/workers");
    return { success: true };
}

export async function updateWorker(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;
    const wage = formData.get("wage")
        ? parseFloat(formData.get("wage") as string)
        : null;

    await prisma.worker.update({
        where: { id },
        data: { name, phone, wage },
    });

    revalidatePath("/attendance");
    revalidatePath("/workers");
    return { success: true };
}

export async function getWorkers(siteId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (siteId) where.siteId = siteId;

    return prisma.worker.findMany({
        where,
        orderBy: { name: "asc" },
    });
}

export async function deactivateWorker(id: string) {
    await prisma.worker.update({
        where: { id },
        data: { isActive: false },
    });
    revalidatePath("/attendance");
    return { success: true };
}

// ============ ATTENDANCE ACTIONS ============

export async function markAttendance(
    workerId: string,
    siteId: string,
    date: string,
    status: string,
    notes?: string
) {
    const dateObj = new Date(date);

    // Upsert to handle duplicates - update if exists, create if not
    await prisma.attendance.upsert({
        where: {
            workerId_date: { workerId, date: dateObj },
        },
        update: { siteId, status, notes: notes || null },
        create: { workerId, siteId, date: dateObj, status, notes: notes || null },
    });

    revalidatePath("/attendance");
    return { success: true };
}

export async function bulkMarkAttendance(
    entries: { workerId: string; siteId: string; status: string; notes?: string }[],
    date: string,
    markedBy?: string
) {
    const dateObj = new Date(date);

    for (const entry of entries) {
        await prisma.attendance.upsert({
            where: {
                workerId_date: { workerId: entry.workerId, date: dateObj },
            },
            update: { siteId: entry.siteId, status: entry.status, notes: entry.notes || null, markedBy: markedBy || null },
            create: {
                workerId: entry.workerId,
                siteId: entry.siteId,
                date: dateObj,
                status: entry.status,
                notes: entry.notes || null,
                markedBy: markedBy || null,
            },
        });
    }

    revalidatePath("/attendance");
    return { success: true };
}

export async function getAttendanceForDate(date: string, siteId?: string) {
    const dateObj = new Date(date);

    const where: Record<string, unknown> = { date: dateObj };
    if (siteId) {
        where.siteId = siteId; // Now querying Attendance.siteId instead of worker.siteId
    }

    return prisma.attendance.findMany({
        where,
        include: {
            site: { select: { name: true } },
            worker: {
                include: { site: { select: { name: true } } },
            },
        },
    });
}

export async function getAttendanceHistory(filters?: {
    workerId?: string;
    siteId?: string;
    startDate?: string;
    endDate?: string;
}) {
    const where: Record<string, unknown> = {};

    if (filters?.workerId) where.workerId = filters.workerId;
    if (filters?.siteId) where.siteId = filters.siteId; // Query Attendance.siteId direct

    if (filters?.startDate || filters?.endDate) {
        where.date = {};
        if (filters?.startDate && filters.startDate !== "undefined" && !isNaN(new Date(filters.startDate).getTime())) {
            (where.date as Record<string, unknown>).gte = new Date(filters.startDate);
        }
        if (filters?.endDate && filters.endDate !== "undefined" && !isNaN(new Date(filters.endDate).getTime())) {
            (where.date as Record<string, unknown>).lte = new Date(filters.endDate);
        }
    }

    return prisma.attendance.findMany({
        where,
        include: {
            worker: {
                include: { site: { select: { name: true } } },
            },
        },
        orderBy: { date: "desc" },
    });
}

export async function getWorkerAttendanceSummary(workerId: string) {
    const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: { site: { select: { name: true } } },
    });

    const attendance = await prisma.attendance.findMany({
        where: { workerId },
    });

    const totalPresent = attendance.filter((a) => a.status === "present").length;
    const totalAbsent = attendance.filter((a) => a.status === "absent").length;
    const totalHalfDay = attendance.filter((a) => a.status === "half-day").length;

    return {
        worker,
        totalPresent,
        totalAbsent,
        totalHalfDay,
        totalDays: attendance.length,
    };
}

// ============ DEDUCTION ACTIONS ============

export async function createDeduction(
    workerId: string,
    amount: number,
    date: string,
    reason?: string
) {
    await prisma.deduction.create({
        data: {
            workerId,
            amount,
            date: new Date(date),
            reason: reason || null,
        },
    });

    revalidatePath(`/workers/${workerId}`);
    return { success: true };
}

export async function getDeductions(
    workerId: string,
    startDate?: string,
    endDate?: string
) {
    const where: Record<string, unknown> = { workerId };

    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    return prisma.deduction.findMany({
        where,
        orderBy: { date: "desc" },
    });
}

export async function deleteDeduction(id: string) {
    const deduction = await prisma.deduction.delete({ where: { id } });
    revalidatePath(`/workers/${deduction.workerId}`);
    return { success: true };
}

export async function getWorkerWageSummary(
    workerId: string,
    startDate: string,
    endDate: string
) {
    const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: { site: { select: { name: true } } },
    });

    if (!worker) return null;

    const dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
    };

    // Get attendance for the period
    const attendance = await prisma.attendance.findMany({
        where: { workerId, date: dateFilter },
    });

    const presentDays = attendance.filter((a) => a.status === "present").length;
    const halfDays = attendance.filter((a) => a.status === "half-day").length;
    const absentDays = attendance.filter((a) => a.status === "absent").length;
    const effectiveDays = presentDays + halfDays * 0.5;

    // Gross earnings
    const grossAmount = effectiveDays * (worker.wage || 0);

    // Get deductions for the period
    const deductions = await prisma.deduction.findMany({
        where: { workerId, date: dateFilter },
        orderBy: { date: "desc" },
    });

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPayable = grossAmount - totalDeductions;

    return {
        worker,
        presentDays,
        halfDays,
        absentDays,
        effectiveDays,
        grossAmount,
        deductions,
        totalDeductions,
        netPayable,
    };
}
