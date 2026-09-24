import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { addNewStorageItem, deleteStorageItem, getStorageItemList } from '../service/storage_service.js';


const paramToString = (value: string | string[] | undefined): string =>
    value === undefined ? '' : Array.isArray(value) ? value.join(',') : value.trim();

export const getListMediaGallery = async (req: Request, res: Response) => {
    try {
        const statusParam = paramToString(req.params.statusParam) || paramToString(req.query.statusParam as string | string[] | undefined);

        if (statusParam && !['active', 'archived', 'deleted'].includes(statusParam)) {
            return res.status(400).json({ error: 'Invalid status parameter' });
        }

        const storageItems = await getStorageItemList(statusParam || "active")
        res.status(200).json(storageItems);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve media gallery items' });
    }
}

export const createMediaGallery = async (req: Request, res: Response) => {
    try {
        const { key, name, size, type, status } = req.body;

        await addNewStorageItem({ key, name, size, type, status });

        res.status(201).json({ message: 'Media gallery item created successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create media gallery item' });
    }
}

export const deleteMediaGallery = async (req: Request, res: Response) => {
    try {
        const id = paramToString(req.params.id);

        if (id === '') {
            return res.status(400).json({ error: 'Invalid id parameter' });
        }

        await deleteStorageItem(id);
        res.status(200).json({ message: 'Media gallery item deleted successfully' });
    }
    catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            return res.status(404).json({ error: 'Media gallery item not found' });
        }
        res.status(500).json({ error: 'Failed to delete media gallery item' });
    }
}