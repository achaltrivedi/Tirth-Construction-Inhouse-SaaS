"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// ============ SITE ACTIONS ============

export async function createSite(formData: FormData) {
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
    const name = formData.get("name") as string;
    const clientName = formData.get("clientName") as string;
    const projectType = formData.get("projectType") as string;
    const contractValue = formData.get("contractValue")
        ? (formData.get("contractValue") as string)
        : null;
    const startDate = new Date(formData.get("startDate") as string);
    const status = (formData.get("status") as string) || "active";

    await prisma.site.update({
        where: { id },
        data: { name, clientName, projectType, contractValue, startDate, status },
    });

    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);
    return { success: true };
}

export async function getSites() {
    return prisma.site.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { transactions: { where: { isDeleted: false } } } },
        },
    });
}

export async function updateSiteStatus(id: string, status: string) {
    await prisma.site.update({
        where: { id },
        data: { status },
    });

    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);
    return { success: true };
}

export async function getSiteById(id: string) {
    return prisma.site.findUnique({
        where: { id },
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
    const transactions = await prisma.transaction.findMany({
        where: { siteId, isDeleted: false },
    });

    const totalCashIn = transactions.reduce((sum, t) => sum + t.cashIn, 0);
    const totalCashOut = transactions.reduce((sum, t) => sum + t.cashOut, 0);
    const netPosition = totalCashIn - totalCashOut;
    const lastEntry = transactions.length > 0 ? transactions[0] : null;

    return { totalCashIn, totalCashOut, netPosition, lastEntry, count: transactions.length };
}

// ============ TRANSACTION ACTIONS ============

export async function createTransaction(
    formData: FormData,
    userId: string,
    userName: string
) {
    const siteId = formData.get("siteId") as string;
    const date = new Date(formData.get("date") as string);
    const description = formData.get("description") as string;
    const cashIn = parseFloat(formData.get("cashIn") as string) || 0;
    const cashOut = parseFloat(formData.get("cashOut") as string) || 0;
    const netValue = cashIn - cashOut;

    await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: { siteId, date, description, cashIn, cashOut, netValue, addedBy: userName },
        });

        await tx.auditLog.create({
            data: {
                userId,
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
    formData: FormData,
    userId: string
) {
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
                userId,
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

export async function softDeleteTransaction(id: string, userId: string) {
    const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });

        await tx.auditLog.create({
            data: {
                userId,
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
