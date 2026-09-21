import path from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { parseFile } from 'music-metadata';

export const MIME_WHITELIST: Set<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
  'audio/x-m4a',
  'audio/aac',
  'audio/webm',
]);

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
  'video/mpeg': '.mpeg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'audio/flac': '.flac',
  'audio/ogg': '.oga',
  'audio/opus': '.opus',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/webm': '.weba',
};

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export interface MetadataSummary {
  [key: string]: unknown;
}

export interface MetadataDetail {
  label: string;
  value: string;
}

export interface ExtractedMetadata {
  kind: MediaKind;
  summary: MetadataSummary;
  details: MetadataDetail[];
}

function kindOf(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object') {
    if (Array.isArray(v)) {
      const parts = v.map(str).filter((x): x is string => x !== null);
      return parts.length ? parts.join(', ') : null;
    }
    if ('numerator' in v && 'denominator' in v) {
      const { numerator, denominator } = v as { numerator: number; denominator: number };
      const n = numerator / denominator;
      return Number.isInteger(n) ? String(n) : String(n).slice(0, 8);
    }
    if ('no' in v) {
      const no = str(v.no);
      const of = str('of' in v ? v.of : null);
      if (!no && !of) return null;
      return [no, of].filter((x): x is string => x !== null).join('/');
    }
    const maybeIso = (v as { toISOString?: unknown }).toISOString;
    if (typeof maybeIso === 'function') return maybeIso.call(v);
    return JSON.stringify(v);
  }
  return String(v);
}

function formatCoord(decimal: number): string | null {
  if (typeof decimal !== 'number' || !Number.isFinite(decimal)) return null;
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = Math.round((minFull - min) * 60);
  return `${deg}° ${min}' ${sec}"`;
}

function formatDuration(seconds: number): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function formatBytes(bytes: number): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const unit = units[i] ?? '';
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${unit}`;
}

async function extractImageMetadata(filePath: string): Promise<ExtractedMetadata> {
  const details: MetadataDetail[] = [];
  const summary: MetadataSummary = {};

  const target: string[] = [
    'Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings',
    'ISO', 'FocalLength', 'FocalLengthIn35mmFormat', 'DateTimeOriginal', 'CreateDate',
    'Latitude', 'Longitude', 'ExposureProgram', 'ExposureBiasValue', 'WhiteBalance',
    'Software',
  ];
  const exif = (await exifr.parse(filePath, target).catch(() => null)) as Record<string, any> | null;

  const sharpMeta = await sharp(filePath).metadata().catch(() => null);
  if (sharpMeta) {
    summary.width = sharpMeta.width;
    summary.height = sharpMeta.height;
    if (sharpMeta.width && sharpMeta.height) {
      details.push({ label: 'Dimensions', value: `${sharpMeta.width} × ${sharpMeta.height} px` });
    }
    if (sharpMeta.format) {
      details.push({ label: 'Format', value: sharpMeta.format.toUpperCase() });
    }
  }

  if (exif) {
    const camera = [str(exif.Make), str(exif.Model)].filter((x): x is string => Boolean(x)).join(' ');
    if (camera) {
      summary.camera = camera;
      details.push({ label: 'Camera', value: camera });
    }
    const fields: Array<[string, string]> = [
      ['Lens', 'LensModel'],
      ['Focal length', 'FocalLength'],
      ['Aperture', 'FNumber'],
      ['Exposure time', 'ExposureTime'],
      ['ISO', 'ISOSpeedRatings'],
      ['Date taken', 'DateTimeOriginal'],
      ['Software', 'Software'],
    ];
    for (const [label, key] of fields) {
      const value = str(exif[key]);
      if (exif[key] !== undefined && value !== null) {
        details.push({ label, value });
      }
    }
    if (exif.Latitude !== undefined && exif.Longitude !== undefined) {
      const lat = formatCoord(exif.Latitude);
      const lon = formatCoord(exif.Longitude);
      if (lat && lon) {
        details.push({ label: 'GPS', value: `${lat} ${exif.Latitude >= 0 ? 'N' : 'S'}, ${lon} ${exif.Longitude >= 0 ? 'E' : 'W'}` });
      }
    }
  }

  return { kind: 'image', summary, details };
}

async function extractMediaMetadata(filePath: string, mime: string): Promise<ExtractedMetadata> {
  const kind = kindOf(mime);
  const meta = await parseFile(filePath, { skipCovers: true }).catch(() => null);
  const details: MetadataDetail[] = [];
  const summary: MetadataSummary = {};
  const add = (label: string, value: unknown): void => {
    const s = str(value);
    if (s !== null && s !== '') details.push({ label, value: s });
  };

  if (!meta) return { kind, summary, details };

  const fmt = meta.format;
  const common = meta.common;

  if (common.title && common.title !== path.basename(filePath)) {
    summary.title = common.title;
    add('Title', common.title);
  }
  add('Artist', common.artist);
  add('Album', common.album);
  add('Album artist', common.albumartist);
  add('Year', common.year);
  add('Genre', common.genre);
  add('Track', common.track);
  add('Comment', common.comment?.map((c) => c.text ?? c.descriptor ?? '').join(', '));
  add('Composer', common.composer?.join(', '));
  if (common.picture && common.picture.length) {
    details.push({ label: 'Cover art', value: 'Yes' });
  }

  if (typeof fmt.duration === 'number') {
    summary.duration = fmt.duration;
    add('Duration', formatDuration(fmt.duration));
  }
  add('Container', fmt.container);
  add('Codec', fmt.codec);
  if (fmt.codecProfile) {
    add('Codec profile', fmt.codecProfile);
  }
  if (fmt.bitrate) {
    summary.bitrate = fmt.bitrate;
    add('Bitrate', `${formatBytes(fmt.bitrate)}/s`);
  }
  add('Sample rate', fmt.sampleRate ? `${str(fmt.sampleRate)} Hz` : null);
  add('Channels', fmt.numberOfChannels);

  for (const track of fmt.trackInfo) {
    if (track.audio) {
      const audio = track.audio;
      add('Audio format', track.codecName);
      add('Audio sample rate', audio.samplingFrequency ? `${str(audio.samplingFrequency)} Hz` : null);
      add('Audio channels', audio.channels);
      add('Audio bit depth', audio.bitDepth ? `${str(audio.bitDepth)} bit` : null);
    }
    if (track.video) {
      const video = track.video;
      const width = video.displayWidth ?? video.pixelWidth;
      const height = video.displayHeight ?? video.pixelHeight;
      if (width && height) {
        summary.width = width;
        summary.height = height;
        add('Resolution', `${width} × ${height}`);
      }
      add('Video codec', track.codecName);
    }
  }

  const nativeFields: Array<[string, string]> = [
    ['Recorded', 'recordingdate'],
    ['Created', 'creationdate'],
    ['Encoder', 'encodedby'],
    ['Website', 'website'],
  ];
  for (const [label, key] of nativeFields) {
    const tags = meta.native[key];
    if (tags?.length) {
      add(label, tags.map((t) => str(t.value)).filter((x): x is string => x !== null).join(', '));
    }
  }

  return { kind, summary, details };
}

export async function extractMetadata(filePath: string, mime: string, sizeBytes?: number): Promise<ExtractedMetadata> {
  const kind = kindOf(mime);
  const base: ExtractedMetadata = { kind, summary: {}, details: [] };
  try {
    const extracted = kind === 'image'
      ? await extractImageMetadata(filePath)
      : await extractMediaMetadata(filePath, mime);
    base.summary = { ...base.summary, ...extracted.summary };
    base.details = extracted.details;
  } catch {
    base.summary = {};
    base.details = [];
  }
  if (sizeBytes !== undefined && sizeBytes !== null) {
    base.summary.size = sizeBytes;
  }
  return base;
}

export default { extractMetadata, MIME_WHITELIST, EXT_BY_MIME, kindOf };