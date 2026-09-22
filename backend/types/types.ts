export interface StorageItemSummary {
    key: string;
    name: string;
    size: number | undefined;
    type: StorageItemType;
    status: StorageItemStatus;
    createdAt: string;
    lastModifiedAt: string | undefined;
}

export interface StorageItem {
    key: string;
    name: string;
    size: number | undefined;
    type: StorageItemType;
    status: StorageItemStatus;
    url: string;
    createdAt: string;
    lastModifiedAt: string | undefined;
}

export interface S3StorageItem {
    key: string;
    size: number | undefined;
    url: string;
    lastModifiedAt: Date | undefined;
}

export type StorageItemType = "image" | "video" | "audio" | "document" | "other";
export type StorageItemStatus = "active" | "archived" | "deleted";