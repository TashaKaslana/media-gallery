import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import type { StorageItem, StorageItemSummary } from "../types/types.js";
import { createUploadUrl, deleteStorageItem as deleteS3Object, getStorageList } from "./cloudflare_service.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const storageKey = (name: string): string => {
    const ext = name.match(/(\.[a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase();
    return ext ? `${randomUUID()}${ext}` : randomUUID();
};

export const createPresignedUpload = async (name: string, contentType: string) => {
    const key = storageKey(name);
    const url = await createUploadUrl(key, contentType);
    return { key, url };
};

export const addNewStorageItem = async (item: StorageItem): Promise<StorageItem> => {
    const status = ["active", "archived", "deleted"].includes(item.status) ? item.status : "active";

    const created = await prisma.storage.create({
        data: {
            key: item.key,
            name: item.name,
            size: item.size ?? 0,
            type: item.type,
            status: status
        }
    });

    return {
        id: created.id,
        key: created.key,
        name: created.name,
        size: created.size,
        type: created.type,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
        lastModifiedAt: created.lastModifiedAt.toISOString(),
    };
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