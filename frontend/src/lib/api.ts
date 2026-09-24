import type { MediaItem, MediaKind, UploadResponse } from '@/types'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_BASE = `${API_ORIGIN}/api/gallerys`

export const apiOrigin = API_ORIGIN

interface GalleryItem {
  id: string
  key: string
  name: string
  size?: number
  type: string
  status: string
  url?: string
  createdAt?: string
}

interface UploadUrlResponse {
  key: string
  url: string
}

export function resolveMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ''
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }
  return `${API_ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

function kindFromType(type: string): MediaKind {
  if (type === 'image' || type.startsWith('image/')) return 'image'
  if (type === 'video' || type.startsWith('video/')) return 'video'
  if (type === 'audio' || type.startsWith('audio/')) return 'audio'
  return 'file'
}

function toMediaItem(item: GalleryItem): MediaItem {
  const kind = kindFromType(item.type)
  const fileUrl = item.url ?? ''
  return {
    id: item.id,
    name: item.name,
    mimeType: item.type,
    kind,
    size: item.size ?? 0,
    createdAt: item.createdAt ?? new Date().toISOString(),
    thumbnailable: kind === 'image' && fileUrl !== '',
    metadata: {
      kind,
      summary: { size: item.size },
      details: [],
    },
    fileUrl,
    thumbnailUrl: fileUrl,
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error || fallback
  } catch {
    return fallback
  }
}

export async function getMedia(): Promise<MediaItem[]> {
  const res = await fetch(`${API_BASE}/active`)
  if (!res.ok) throw new Error(await readError(res, `Failed to load media (${res.status})`))
  const items = (await res.json()) as GalleryItem[]
  return items.map(toMediaItem)
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res, `Delete failed (${res.status})`))
}

function putToSignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))
    xhr.send(file)
  })
}

export function uploadFiles(
  files: File[],
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  return (async () => {
    const items: MediaItem[] = []
    const total = files.reduce((sum, file) => sum + file.size, 0) || 1
    let uploaded = 0

    for (const file of files) {
      const contentType = file.type || 'application/octet-stream'
      const signedRes = await fetch(`${API_BASE}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, contentType }),
      })
      if (!signedRes.ok) throw new Error(await readError(signedRes, `Failed to create upload URL (${signedRes.status})`))
      const signed = (await signedRes.json()) as UploadUrlResponse

      await putToSignedUrl(signed.url, file, contentType, (loaded) => {
        onProgress(Math.min(100, Math.round(((uploaded + loaded) / total) * 100)))
      })
      uploaded += file.size

      const createdRes = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: signed.key,
          name: file.name,
          size: file.size,
          type: contentType,
          status: 'active',
        }),
      })
      if (!createdRes.ok) throw new Error(await readError(createdRes, `Failed to save media (${createdRes.status})`))
      items.push(toMediaItem((await createdRes.json()) as GalleryItem))
    }

    onProgress(100)
    return { count: items.length, skipped: 0, items }
  })()
}
