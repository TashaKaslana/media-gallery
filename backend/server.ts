import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { fileTypeFromFile, type FileTypeResult } from 'file-type';
import mimeTypes from 'mime-types';
import { extractMetadata, MIME_WHITELIST, EXT_BY_MIME, type ExtractedMetadata, type MediaKind } from './metadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMB_DIR = path.join(__dirname, 'storage', 'thumbs');
const DATA_DIR = path.join(__dirname, 'data');
const INDEX_FILE = path.join(DATA_DIR, 'media.json');
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const THUMB_SIZE = 480;

interface MediaRecord {
  id: string;
  name: string;
  storedName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  createdAt: string;
  metadata: ExtractedMetadata;
}

interface PublicMediaRecord {
  id: string;
  name: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  createdAt: string;
  thumbnailable: boolean;
  metadata: ExtractedMetadata;
  fileUrl: string;
  thumbnailUrl: string;
}

let index: MediaRecord[] = [];

async function ensureDirs(): Promise<void> {
  await Promise.all([
    fs.mkdir(UPLOAD_DIR, { recursive: true }),
    fs.mkdir(THUMB_DIR, { recursive: true }),
    fs.mkdir(DATA_DIR, { recursive: true }),
  ]);
}

async function loadIndex(): Promise<void> {
  try {
    index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf8')) as MediaRecord[];
  } catch {
    index = [];
  }
}

async function saveIndex(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

function findRecord(id: string): MediaRecord | undefined {
  return index.find((r) => r.id === id);
}

function publicRecord(record: MediaRecord): PublicMediaRecord {
  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    kind: record.kind,
    size: record.size,
    createdAt: record.createdAt,
    thumbnailable: record.kind === 'image',
    metadata: record.metadata,
    fileUrl: `/api/media/${record.id}/file`,
    thumbnailUrl: `/api/media/${record.id}/thumbnail`,
  };
}

async function reconcileIndex(): Promise<void> {
  const stored = await fs.readdir(UPLOAD_DIR).catch((): string[] => []);
  const stale = index.filter((r) => !stored.includes(r.storedName));
  if (stale.length) {
    index = index.filter((r) => stored.includes(r.storedName));
    for (const r of stale) {
      await fs.rm(path.join(THUMB_DIR, `${r.id}.jpg`), { force: true });
    }
    await saveIndex();
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (MIME_WHITELIST.has(file.mimetype)) return cb(null, true);
    const extType = mimeTypes.lookup(file.originalname);
    if (extType && MIME_WHITELIST.has(extType)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype || 'unknown'}`));
  },
});

const app = express();
app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(',').map((origin) => origin.trim()) : '*',
  }),
);
app.use(express.json());

app.get('/api/media', async (req, res) => {
  await reconcileIndex();
  const items = [...index].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(items.map(publicRecord));
});

app.get('/api/media/:id', (req, res) => {
  const record = findRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Media not found' });
  res.json(publicRecord(record));
});

app.get('/api/media/:id/file', (req, res) => {
  const record = findRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Media not found' });
  const filePath = path.join(UPLOAD_DIR, record.storedName);
  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('Content-Length', String(record.size));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(record.name)}`);
  createReadStream(filePath).on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read file' });
  }).pipe(res);
});

app.get('/api/media/:id/thumbnail', async (req, res) => {
  const record = findRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Media not found' });
  if (record.kind !== 'image') return res.status(404).json({ error: 'No thumbnail' });
  const thumbPath = path.join(THUMB_DIR, `${record.id}.jpg`);
  try {
    await fs.access(thumbPath);
  } catch {
    const source = path.join(UPLOAD_DIR, record.storedName);
    try {
      await sharp(source, { failOn: 'none' })
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(thumbPath);
    } catch {
      return res.status(422).json({ error: 'Thumbnail generation failed' });
    }
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  createReadStream(thumbPath).on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read thumbnail' });
  }).pipe(res);
});

app.post('/api/upload', upload.array('files', 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const results: PublicMediaRecord[] = [];
  let skipped = 0;
  for (const file of files) {
    const raw = path.join(UPLOAD_DIR, file.filename);
    let provided = MIME_WHITELIST.has(file.mimetype) ? file.mimetype : null;
    let mime: string | null = provided;
    let sniffed: FileTypeResult | null = null;
    if (!mime) {
      sniffed = (await fileTypeFromFile(raw).catch(() => null)) ?? null;
      if (sniffed && MIME_WHITELIST.has(sniffed.mime)) mime = sniffed.mime;
    }
    if (!mime) {
      const extType = mimeTypes.lookup(file.originalname);
      if (extType && MIME_WHITELIST.has(extType)) mime = extType;
    }
    if (!mime) {
      await fs.rm(raw, { force: true });
      skipped += 1;
      continue;
    }
    if (sniffed && sniffed.ext && path.extname(file.filename) !== `.${sniffed.ext}`) {
      const renamed = `${path.basename(file.filename, path.extname(file.filename))}.${sniffed.ext}`;
      await fs.rename(raw, path.join(UPLOAD_DIR, renamed));
      file.filename = renamed;
    }
    const now = new Date().toISOString();
    const id = uuidv4();
    const metaResult = await extractMetadata(path.join(UPLOAD_DIR, file.filename), mime, file.size);
    const record: MediaRecord = {
      id,
      name: file.originalname,
      storedName: file.filename,
      mimeType: mime,
      kind: metaResult.kind,
      size: file.size,
      createdAt: now,
      metadata: metaResult,
    };
    if (record.kind === 'image') {
      try {
        await sharp(path.join(UPLOAD_DIR, file.filename), { failOn: 'none' })
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toFile(path.join(THUMB_DIR, `${id}.jpg`));
      } catch {
        record.metadata.summary.thumbFailed = true;
      }
    }
    index.push(record);
    results.push(publicRecord(record));
  }
  await saveIndex();
  res.status(201).json({ count: results.length, skipped, items: results });
});

app.delete('/api/media/:id', async (req, res) => {
  const recordIndex = index.findIndex((r) => r.id === req.params.id);
  if (recordIndex === -1) return res.status(404).json({ error: 'Media not found' });
  const [record] = index.splice(recordIndex, 1);
  if (!record) return res.status(404).json({ error: 'Media not found' });
  await Promise.all([
    fs.rm(path.join(UPLOAD_DIR, record.storedName), { force: true }),
    fs.rm(path.join(THUMB_DIR, `${record.id}.jpg`), { force: true }),
  ]);
  await saveIndex();
  res.json({ ok: true, id: record.id });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err instanceof Error) {
    return res.status(400).json({ error: err.message || 'Server error' });
  }
  if (err) {
    return res.status(400).json({ error: 'Server error' });
  }
  next();
});

ensureDirs().then(loadIndex).then(reconcileIndex).then(() => {
  app.listen(PORT, () => {
    console.log(`Media gallery API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${CORS_ORIGIN || '*'}`);
  });
});