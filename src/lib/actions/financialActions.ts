"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security";

// ============ SITE ACTIONS ============

export async function createSite(formData: FormData) {
    await requireUser();

    const name = formData.get("name") as string;
    const clientName = formData.get("clientName") as string;
    const projectType = formData.get("projectType") as string;
    const contractValue = formData.get("contractValue")
        ? (formData.get("contractValue") as string)
        : null;
    const startDate = new Date(formData.get("startDate") as string);
    const status = (formData.get("status") as string) || "active";

    await prisma.site.create({
        data: { name, clientName, projectType, contractValue, startDate, status },
    });

    revalidatePath("/sites");
    return { success: true };
}

export async function updateSite(id: string, formData: FormData) {
    await requireUser();

    const name = formData.get("name") as string;
    const clientName = formData.get("clientName") as string;
    const projectType = formData.get("projectType") as string;
    const contractValue = formData.get("contractValue")
        ? (formData.get("contractValue") as string)
        : null;
    const startDate = new Date(formData.get("startDate") as string);
    const status = (formData.get("status") as string) || "active";

    const result = await prisma.site.updateMany({
        where: { id, isDeleted: false },
        data: { name, clientName, projectType, contractValue, startDate, status },
    });

    if (result.count === 0) {
        throw new Error("Site not found");
    }

    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);
    return { success: true };
}

export async function getSites() {
    await requireUser();

    return prisma.site.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { transactions: { where: { isDeleted: false } } } },
        },
    });
}

export async function updateSiteStatus(id: string, status: string) {
    await requireUser();

    const result = await prisma.site.updateMany({
        where: { id, isDeleted: false },
        data: { status },
    });

    if (result.count === 0) {
        throw new Error("Site not found");
    }

    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);
    return { success: true };
}

export async function getSiteById(id: string) {
    await requireUser();

    return prisma.site.findFirst({
        where: { id, isDeleted: false },
        include: {
            transactions: {
                where: { isDeleted: false },
                orderBy: { date: "desc" },
                select: {
                    id: true,
                    date: true,
                    description: true,
                    cashIn: true,
                    cashOut: true,
                    netValue: true,
                    addedBy: true,
                },
            },
        },
    });
}

export async function getSiteSummary(siteId: string) {
    await requireUser();

    const site = await prisma.site.findFirst({
        where: { id: siteId, isDeleted: false },
        select: { id: true },
    });

    if (!site) return null;

    const transactions = await prisma.transaction.findMany({
        where: { siteId, isDeleted: false },
    });

    const totalCashIn = transactions.reduce((sum, t) => sum + t.cashIn, 0);
    const totalCashOut = transactions.reduce((sum, t) => sum + t.cashOut, 0);
    const netPosition = totalCashIn - totalCashOut;
    const lastEntry = transactions.length > 0 ? transactions[0] : null;

    return { totalCashIn, totalCashOut, netPosition, lastEntry, count: transactions.length };
}

export async function softDeleteSite(id: string) {
    const user = await requireUser(["admin"]);

    const result = await prisma.site.updateMany({
        where: { id, isDeleted: false },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: user.id,
            status: "completed",
        },
    });

    if (result.count === 0) {
        throw new Error("Site not found");
    }

    revalidatePath("/sites");
    revalidatePath("/dashboard");
    revalidatePath("/ledger");
    revalidatePath("/attendance");
    revalidatePath(`/sites/${id}`);
    return { success: true };
}

// ============ TRANSACTION ACTIONS ============

export async function createTransaction(formData: FormData) {
    const user = await requireUser();
    const siteId = formData.get("siteId") as string;
    const date = new Date(formData.get("date") as string);
    const description = formData.get("description") as string;
    const cashIn = parseFloat(formData.get("cashIn") as string) || 0;
    const cashOut = parseFloat(formData.get("cashOut") as string) || 0;
    const netValue = cashIn - cashOut;

    const site = await prisma.site.findFirst({
        where: { id: siteId, isDeleted: false },
        select: { id: true },
    });

    if (!site) {
        throw new Error("Cannot add entries to a deleted site");
    }

    await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: { siteId, date, description, cashIn, cashOut, netValue, addedBy: user.name },
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                transactionId: transaction.id,
                action: "create",
                newValue: JSON.stringify({ date, description, cashIn, cashOut, netValue }),
            },
        });
    });

    revalidatePath(`/sites/${siteId}`);
    revalidatePath("/ledger");
    return { success: true };
}

export async function updateTransaction(
    id: string,
    formData: FormData
) {
    const user = await requireUser();
    const date = new Date(formData.get("date") as string);
    const description = formData.get("description") as string;
    const cashIn = parseFloat(formData.get("cashIn") as string) || 0;
    const cashOut = parseFloat(formData.get("cashOut") as string) || 0;
    const netValue = cashIn - cashOut;

    const result = await prisma.$transaction(async (tx) => {
        const oldTransaction = await tx.transaction.findUnique({ where: { id } });

        const transaction = await tx.transaction.update({
            where: { id },
            data: { date, description, cashIn, cashOut, netValue },
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                transactionId: id,
                action: "update",
                oldValue: JSON.stringify(oldTransaction),
                newValue: JSON.stringify({ date, description, cashIn, cashOut, netValue }),
            },
        });

        return transaction;
    });

    revalidatePath(`/sites/${result.siteId}`);
    revalidatePath("/ledger");
    return { success: true };
}

export async function softDeleteTransaction(id: string) {
    const user = await requireUser();
    const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: user.id,
            },
        });

        await tx.auditLog.create({
            data: {
                userId: user.id,
                transactionId: id,
                action: "delete",
                oldValue: JSON.stringify(transaction),
            },
        });

        return transaction;
    });

    revalidatePath(`/sites/${result.siteId}`);
    revalidatePath("/ledger");
    return { success: true };
}

// ============ MASTER LEDGER ============

export async function getMasterLedger(filters?: {
    siteId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
}) {
    await requireUser();

    const where: Record<string, unknown> = { isDeleted: false };

    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.startDate || filters?.endDate) {
        where.date = {};
        if (filters?.startDate) (where.date as Record<string, unknown>).gte = new Date(filters.startDate);
        if (filters?.endDate) (where.date as Record<string, unknown>).lte = new Date(filters.endDate);
    }
    if (filters?.keyword) {
        where.description = { contains: filters.keyword };
    }

    return prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        select: {
            id: true,
            date: true,
            description: true,
            cashIn: true,
            cashOut: true,
            netValue: true,
            addedBy: true,
            site: { select: { name: true } },
        },
    });
}
