import axios, { isAxiosError } from 'axios'
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
