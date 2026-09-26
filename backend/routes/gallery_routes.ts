import { Router } from 'express';
import { getListMediaGallery, createUploadUrl, createMediaGallery, deleteMediaGallery, updateGalleryItem } from '../controller/storage_controller.js';

const galleryRoutes = Router();

galleryRoutes.post('/upload-url', createUploadUrl);
galleryRoutes.patch('/:id', updateGalleryItem);
galleryRoutes.get('/:statusParam', getListMediaGallery);
galleryRoutes.post('/', createMediaGallery);
galleryRoutes.delete('/:id', deleteMediaGallery);

export default galleryRoutes;