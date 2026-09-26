import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { addNewStorageItem, createPresignedUpload, deleteStorageItem, getStorageItemList, updateStorageItem } from '../service/storage_service.js';


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
        console.error('Error retrieving media gallery items:', err);
    }
}

export const createUploadUrl = async (req: Request, res: Response) => {
    try {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim() : '';

        if (name === '' || contentType === '') {
            return res.status(400).json({ error: 'name and contentType are required' });
        }

        const signed = await createPresignedUpload(name, contentType);
        res.status(200).json(signed);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create upload URL' });
    }
}

export const createMediaGallery = async (req: Request, res: Response) => {
    try {
        const { key, name, size, type, status } = req.body;

        if (typeof key !== 'string' || key.trim() === '' || typeof name !== 'string' || name.trim() === '' || typeof type !== 'string' || type.trim() === '') {
            return res.status(400).json({ error: 'key, name, and type are required' });
        }

        const item = await addNewStorageItem({ key: key.trim(), name: name.trim(), size, type: type.trim(), status });

        res.status(201).json(item);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create media gallery item' });
    }
}

export const updateGalleryItem = async (req: Request, res: Response) => {
    try {
        const id = paramToString(req.params.id);
        const updates = req.body;
        
        if (id === '') {
            return res.status(400).json({ error: 'Invalid id parameter' });
        }

        const updatedItem = await updateStorageItem(id, updates);
        
        if (!updatedItem) {
            return res.status(404).json({ error: 'Media gallery item not found' });
        }

        res.status(200).json(updatedItem);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            return res.status(404).json({ error: 'Media gallery item not found' });
        }
        res.status(500).json({ error: 'Failed to update media gallery item' });
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