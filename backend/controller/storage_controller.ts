import type { Request, Response } from 'express';
import { addNewStorageItem, deleteStorageItem, getStorageItemList } from '../service/storage_service.js';


export const getListMediaGallery = async (req: Request, res: Response) => {
    try {
        const {statusParam} : {statusParam?: string} = req.query;

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
        const { key, name, size, type, status, url, createdAt, lastModifiedAt } = req.body;

        await addNewStorageItem({ key, name, size, type, status, url, createdAt, lastModifiedAt });
        
        res.status(201).json({ message: 'Media gallery item created successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create media gallery item' });
    }
}

export const deleteMediaGallery = async (req: Request, res: Response) => {
    try {
        const { key } : { key?: string } = req.params;

        if (key === undefined || key.trim() === '') {
            return res.status(400).json({ error: 'Invalid key parameter' });
        }

        await deleteStorageItem(key);
        res.status(200).json({ message: 'Media gallery item deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete media gallery item' });
    }
}
