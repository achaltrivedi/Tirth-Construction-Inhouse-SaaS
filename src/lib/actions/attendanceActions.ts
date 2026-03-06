"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============ WORKER ACTIONS ============

export async function createWorker(formData: FormData) {
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;
    const siteId = formData.get("siteId") as string;
    const wage = formData.get("wage")
        ? parseFloat(formData.get("wage") as string)
        : null;

    await prisma.worker.create({
        data: { name, phone, siteId, wage },
    });

    revalidatePath("/attendance");
    return { success: true };
}

export async function updateWorker(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const phone = (formData.get("phone") as string) || null;
    const siteId = formData.get("siteId") as string;
    const wage = formData.get("wage")
        ? parseFloat(formData.get("wage") as string)
        : null;

    await prisma.worker.update({
        where: { id },
        data: { name, phone, siteId, wage },
    });

    revalidatePath("/attendance");
    return { success: true };
}

export async function getWorkers(siteId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (siteId) where.siteId = siteId;

    return prisma.worker.findMany({
        where,
        include: { site: { select: { name: true } } },
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
        update: { status, notes: notes || null },
        create: { workerId, date: dateObj, status, notes: notes || null },
    });

    revalidatePath("/attendance");
    return { success: true };
}

export async function bulkMarkAttendance(
    entries: { workerId: string; status: string; notes?: string }[],
    date: string
) {
    const dateObj = new Date(date);

    for (const entry of entries) {
        await prisma.attendance.upsert({
            where: {
                workerId_date: { workerId: entry.workerId, date: dateObj },
            },
            update: { status: entry.status, notes: entry.notes || null },
            create: {
                workerId: entry.workerId,
                date: dateObj,
                status: entry.status,
                notes: entry.notes || null,
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
        where.worker = { siteId };
    }

    return prisma.attendance.findMany({
        where,
        include: {
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
    if (filters?.siteId) where.worker = { siteId: filters.siteId };

    if (filters?.startDate || filters?.endDate) {
        where.date = {};
        if (filters?.startDate) (where.date as Record<string, unknown>).gte = new Date(filters.startDate);
        if (filters?.endDate) (where.date as Record<string, unknown>).lte = new Date(filters.endDate);
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
