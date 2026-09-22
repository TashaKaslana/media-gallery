import { PrismaClient } from "@prisma/client/extension";
import type { StorageItem, StorageItemSummary } from "../types/types.js";
import { getStorageList } from "./cloudflare_service.js";

const prisma = new PrismaClient();

export const addNewStorageItem = async (item: StorageItem) => {
    await prisma.storage.create({
        data: {
            key: item.key,
            name: item.name,
            size: item.size,
            type: item.type,
            status: "active"
        }
    });
};

export const getStorageItemList = async (status: string): Promise<StorageItem[] | null> => {
    const storageItemSummary: StorageItemSummary[] = await prisma.storage.findMany({
        where: { status: status },
    });

    if (!storageItemSummary) {
        return null;
    }    

    const urlList = await getStorageList(storageItemSummary.map(item => item.key))
    const storageItems: StorageItem[] | undefined = urlList?.map((item, index) => {
        const summary = storageItemSummary.find(storageItem => storageItem.key === item.key);
        return {
            key: item.key,
            name: summary?.name || "",
            size: item.size,
            type: summary?.type || "other",
            status: summary?.status || "active",
            url: item.url,
            createdAt: summary?.createdAt || "",
            lastModifiedAt: item.lastModifiedAt ? item.lastModifiedAt.toISOString() : undefined
        };
    })

    return storageItems || null;
}


export const deleteStorageItem = async (key: string) => {
    await prisma.storage.update({
        where: { key: key },
        data: { status: "deleted" }
    });
}