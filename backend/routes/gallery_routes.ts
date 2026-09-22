import { Router } from 'express';
import { getListMediaGallery, createMediaGallery, deleteMediaGallery } from '../controller/storage_controller.js';

const galleryRoutes = Router();

galleryRoutes.get('/:statusParam', getListMediaGallery);
galleryRoutes.post('/', createMediaGallery);
galleryRoutes.delete('/:key', deleteMediaGallery);

export default galleryRoutes;