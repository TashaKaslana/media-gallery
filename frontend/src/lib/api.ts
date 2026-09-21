import type { MediaItem, UploadResponse } from '@/types'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_BASE = `${API_ORIGIN}/api`

export const apiOrigin = API_ORIGIN

export function resolveMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ''
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }
  return `${API_ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export async function getMedia(): Promise<MediaItem[]> {
  const res = await fetch(`${API_BASE}/media`)
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`)
  return res.json()
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/media/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}

export function uploadFiles(
  files: File[],
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/upload`)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.addEventListener('load', () => {
      let payload: UploadResponse | { error?: string }
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        reject(new Error('Unexpected server response'))
        return
      }
      if (xhr.status >= 400) {
        reject(new Error((payload as { error?: string }).error || `Upload failed (${xhr.status})`))
        return
      }
      resolve(payload as UploadResponse)
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.send(form)
  })
}