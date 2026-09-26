import express, { type Application } from 'express';
import galleryRoutes from './routes/gallery_routes.js';
import cors from 'cors';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: CORS_ORIGIN
      ? CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
console.log("CORS_ORIGIN =", process.env.CORS_ORIGIN);

app.use(express.json());

app.use('/api/gallerys', galleryRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
