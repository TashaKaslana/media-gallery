import path from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { parseFile } from 'music-metadata';

export const MIME_WHITELIST = new Set([
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

export const EXT_BY_MIME = {
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

function kindOf(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

function str(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object') {
    if (Array.isArray(v)) {
      const parts = v.map(str).filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    }
    if (v.numerator !== undefined && v.denominator !== undefined) {
      const n = v.numerator / v.denominator;
      return Number.isInteger(n) ? String(n) : String(n).slice(0, 8);
    }
    if ('no' in v) {
      const no = str(v.no);
      const of = str(v.of);
      if (!no && !of) return null;
      return [no, of].filter(Boolean).join('/');
    }
    if (typeof v.toISOString === 'function') return v.toISOString();
    return JSON.stringify(v);
  }
  return String(v);
}

function formatCoord(decimal) {
  if (typeof decimal !== 'number' || !Number.isFinite(decimal)) return null;
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = Math.round((minFull - min) * 60);
  return `${deg}° ${min}' ${sec}"`;
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

async function extractImageMetadata(filePath) {
  const details = [];
  const summary = {};

  const target = [
    'Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings',
    'ISO', 'FocalLength', 'FocalLengthIn35mmFormat', 'DateTimeOriginal', 'CreateDate',
    'Latitude', 'Longitude', 'ExposureProgram', 'ExposureBiasValue', 'WhiteBalance',
    'Software',
  ];
  const exif = await exifr.parse(filePath, target).catch(() => null);

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
    const camera = [str(exif.Make), str(exif.Model)].filter(Boolean).join(' ');
    if (camera) {
      summary.camera = camera;
      details.push({ label: 'Camera', value: camera });
    }
    for (const [label, key] of [
      ['Lens', 'LensModel'],
      ['Focal length', 'FocalLength'],
      ['Aperture', 'FNumber'],
      ['Exposure time', 'ExposureTime'],
      ['ISO', 'ISOSpeedRatings'],
      ['Date taken', 'DateTimeOriginal'],
      ['Software', 'Software'],
    ]) {
      if (exif[key] !== undefined && str(exif[key]) !== null) {
        details.push({ label, value: str(exif[key]) });
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

async function extractMediaMetadata(filePath, mime) {
  const meta = await parseFile(filePath, { skipCovers: true }).catch(() => null);
  const details = [];
  const summary = {};
  const kind = kindOf(mime);
  const add = (label, value) => {
    const s = str(value);
    if (s !== null && s !== '') details.push({ label, value: s });
  };

  if (!meta) return { kind, summary, details };

  const fmt = meta.format || {};
  const common = meta.common || {};

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
  add('Comment', common.comment);
  add('Composer', common.composer);
  if (common.picture && common.picture.length) {
    details.push({ label: 'Cover art', value: 'Yes' });
  }

  if (typeof fmt.duration === 'number') {
    summary.duration = fmt.duration;
    add('Duration', formatDuration(fmt.duration));
  }
  add('Container', fmt.container);
  add('Codec', fmt.codec);
  add('Format', fmt.dataFormat);
  add('Codec profile', fmt.codecProfile);
  if (fmt.bitrate) {
    summary.bitrate = fmt.bitrate;
    add('Bitrate', `${formatBytes(fmt.bitrate)}/s`);
  }
  add('Sample rate', fmt.sampleRate ? `${str(fmt.sampleRate)} Hz` : null);
  add('Channels', fmt.numberOfChannels);

  if (fmt.audio) {
    const audio = fmt.audio;
    if (audio.length) {
      const track = audio[0];
      add('Audio format', track.dataFormat);
      add('Audio codec', track.codec);
      add('Audio sample rate', track.sampleRate ? `${str(track.sampleRate)} Hz` : null);
      add('Audio channels', track.numberOfChannels);
      add('Audio bitrate', track.bitrate ? `${formatBytes(track.bitrate)}/s` : null);
    } else {
      add('Audio format', audio.dataFormat);
    }
  }

  if (fmt.video) {
    const video = Array.isArray(fmt.video) ? fmt.video[0] : fmt.video;
    if (video) {
      if (video.width && video.height) {
        summary.width = video.width;
        summary.height = video.height;
        add('Resolution', `${video.width} × ${video.height}`);
      }
      add('Frame rate', video.frameRate ? `${str(video.frameRate)} fps` : null);
      add('Video codec', video.codec);
      add('Video bitrate', video.bitrate ? `${formatBytes(video.bitrate)}/s` : null);
    }
  }

  for (const [label, key] of [
    ['Recorded', 'recordingdate'],
    ['Created', 'creationdate'],
    ['Encoder', 'encodedby'],
    ['Website', 'website'],
  ]) {
    const v = meta.native && meta.native[key];
    if (v) add(label, str(v));
  }

  return { kind, summary, details };
}

export async function extractMetadata(filePath, mime, sizeBytes) {
  const kind = kindOf(mime);
  const base = { kind, summary: {}, details: [] };
  try {
    let extracted;
    if (kind === 'image') {
      extracted = await extractImageMetadata(filePath);
    } else {
      extracted = await extractMediaMetadata(filePath, mime);
    }
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