import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import type { StorageItem, StorageItemSummary } from "../types/types.js";
import { deleteStorageItem as deleteS3Object, getStorageList } from "./cloudflare_service.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export const addNewStorageItem = async (item: StorageItem) => {
    const status = ["active", "archived", "deleted"].includes(item.status) ? item.status : "active";

    await prisma.storage.create({
        data: {
            key: item.key,
            name: item.name,
            size: item.size ?? 0,
            type: item.type,
            status: status
        }
    });
};

export const getStorageItemList = async (status: string): Promise<StorageItem[]> => {
    const storageItemSummary: StorageItemSummary[] = await prisma.storage.findMany({
        where: { status: status },
    });

    const urlList = await getStorageList(storageItemSummary.map(item => item.key))

    return urlList.map((item) => {
        const summary = storageItemSummary.find(storageItem => storageItem.key === item.key);

        const storageItem: StorageItem = {
            id: summary?.id || "",
            key: item.key,
            name: summary?.name || "",
            type: summary?.type || "other",
            status: summary?.status || "active",
            url: item.url,
            createdAt: summary?.createdAt.toISOString() || "",
        };

        if (item.size !== undefined) {
            storageItem.size = item.size;
        }

        if (item.lastModifiedAt !== undefined) {
            storageItem.lastModifiedAt = item.lastModifiedAt.toISOString();
        }

        return storageItem;
    });
}


export const deleteStorageItem = async (id: string) => {
    const item = await prisma.storage.update({
        where: { id },
        data: { status: "deleted" }
    });

    await deleteS3Object(item.key);
}