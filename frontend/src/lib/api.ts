import axios, { isAxiosError } from 'axios'
import type { MediaItem, MediaKind, UploadResponse } from '@/types'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_BASE = `${API_ORIGIN}/api/gallerys`

interface StoredMediaRecord {
  id: string
  name: string
  mimeType: string
  kind: MediaKind
  size: number
  createdAt: string
  expiresAt: number // Thời gian hết hạn (5 phút)
  blob: Blob
}

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
  if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi') || name.endsWith('.mkv') || name.endsWith('.webm')) {
    return 'video'
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg')) {
    return 'image'
  }

  // 2. Dự phòng kiểm tra theo MIME type của trình duyệt
  if (type.startsWith('audio/')) return 'audio'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('image/')) return 'image'

  return 'file'
}

function createId(file: File): string {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${Date.now()}-${crypto.randomUUID()}-${safeName || 'file'}`
}

function getObjectUrl(record: StoredMediaRecord): string {
  const now = Date.now()
  // Nếu đã quá 5 phút thì không cấp URL nữa (hết hạn)
  if (now > record.expiresAt) {
    return ''
  }

  const existing = objectUrlCache.get(record.id)
  if (existing) return existing

  const url = URL.createObjectURL(record.blob)
  objectUrlCache.set(record.id, url)
  return url
}

function toMediaItem(record: StoredMediaRecord): MediaItem {
  const isExpired = Date.now() > record.expiresAt
  const localUrl = isExpired ? '' : getObjectUrl(record)
  const typeLabel = record.mimeType || 'application/octet-stream'

  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    kind: record.kind,
    size: record.size,
    createdAt: record.createdAt,
    thumbnailable: record.kind === 'image' && !isExpired,
    fileUrl: localUrl,
    thumbnailUrl: localUrl,
    metadata: {
      kind: record.kind,
      summary: {
        size: record.size,
      },
      details: [
        { label: 'Tên tệp', value: record.name },
        { label: 'Loại tệp', value: typeLabel },
        { label: 'Trạng thái Link', value: isExpired ? 'Hết hạn (Expired - Quá 5 phút)' : 'Đang hoạt động (Signed - Dưới 5 phút)' },
        { label: 'Nguồn lưu trữ', value: 'Local browser storage' },
      ],
    },
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function resolveMediaUrl(pathOrUrl: string): string {
  return pathOrUrl || ''
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

function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined
    console.error(fallback, {
      message: error.message,
      code: error.code,
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      response: error.response?.data,
    })
    return data?.error || (error.response ? `${fallback} (${error.response.status})` : fallback)
  }
  console.error(fallback, error)
  return error instanceof Error ? error.message : fallback
}

export async function getMedia(): Promise<MediaItem[]> {
  try {
    const { data } = await axios.get<GalleryItem[]>(`${API_BASE}/active`)
    return data.map(toMediaItem)
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'Failed to load media'))
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/${id}`)
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'Delete failed'))
  }
}

export async function updateMedia(id: string, updates: Partial<GalleryItem>): Promise<MediaItem> {
  try {
    const { data } = await axios.patch<GalleryItem>(`${API_BASE}/${id}`, updates)
    return toMediaItem(data)
  } catch (error) {
    throw new Error(apiErrorMessage(error, 'Update failed'))
  }
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
      else {
        console.error('Upload failed', {
          status: xhr.status,
          statusText: xhr.statusText,
          url,
          response: xhr.responseText,
        })
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    })
    xhr.addEventListener('error', () => {
      console.error('Network error during upload', { url, status: xhr.status, readyState: xhr.readyState })
      reject(new Error('Network error during upload'))
    })
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))
    xhr.send(file)
  })
}

export async function uploadFiles(
  files: File[],
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  return (async () => {
    const items: MediaItem[] = []
    const total = files.reduce((sum, file) => sum + file.size, 0) || 1
    let uploaded = 0

    for (const file of files) {
      const contentType = file.type || 'application/octet-stream'
      let signed: UploadUrlResponse
      try {
        const signedRes = await axios.post<UploadUrlResponse>(`${API_BASE}/upload-url`, {
          name: file.name,
          contentType,
        })
        signed = signedRes.data
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to create upload URL'))
      }

      await putToSignedUrl(signed.url, file, contentType, (loaded) => {
        onProgress(Math.min(100, Math.round(((uploaded + loaded) / total) * 100)))
      })
      uploaded += file.size

      try {
        const createdRes = await axios.post<GalleryItem>(API_BASE, {
          key: signed.key,
          name: file.name,
          size: file.size,
          type: contentType,
          status: 'active',
        })
        items.push(toMediaItem(createdRes.data))
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to save media'))
      }
    }

    onProgress(100)
    return { count: items.length, skipped: 0, items }
  })()
}
