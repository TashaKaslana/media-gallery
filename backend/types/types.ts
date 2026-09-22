export interface StorageItemSummary {
    key: string;
    name: string;
    size: number;
    type: string;
    status: string;
    createdAt: Date;
    lastModifiedAt: Date;
}

export interface StorageItem {
    key: string;
    name: string;
    size?: number;
    type: string;
    status: string;
    url?: string;
    createdAt?: string;
    lastModifiedAt?: string;
}

export interface S3StorageItem {
    key: string;
    size?: number;
    url: string;
    lastModifiedAt?: Date;
}

export type StorageItemType = "image" | "video" | "audio" | "document" | "other";
export type StorageItemStatus = "active" | "archived" | "deleted";