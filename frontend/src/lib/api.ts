import type { MediaItem, MediaKind, UploadResponse } from '@/types'

const DB_NAME = 'media-cloud-storage-local'
const DB_VERSION = 1
const STORE_NAME = 'media'
const objectUrlCache = new Map<string, string>()

interface StoredMediaRecord {
  id: string
  name: string
  mimeType: string
  kind: MediaKind
  size: number
  createdAt: string
  expiresAt: number // Thêm thời gian hết hạn (5 phút)
  blob: Blob
}

export const apiOrigin = 'local'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Cannot open local media storage'))
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = action(tx.objectStore(STORE_NAME))

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Local media operation failed'))
        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Local media transaction failed'))
        }
      }),
  )
}

function getKind(file: File | Blob): MediaKind {
  const type = file.type || ''
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
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

export async function getMedia(): Promise<MediaItem[]> {
  const records = await withStore<StoredMediaRecord[]>('readonly', (store) => store.getAll())
  return records
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toMediaItem)
}

export async function deleteMedia(id: string): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
  const cached = objectUrlCache.get(id)
  if (cached) {
    URL.revokeObjectURL(cached)
    objectUrlCache.delete(id)
  }
}

export async function uploadFiles(
  files: File[],
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  if (!files.length) return { count: 0, skipped: 0, items: [] }

  onProgress(5)
  const db = await openDb()
  const saved: StoredMediaRecord[] = []

  // Thiết lập thời gian hết hạn đúng 5 phút (5 * 60 * 1000 ms) kể từ lúc tải lên
  const FIVE_MINUTES = 5 * 60 * 1000
  const expiresAtTime = Date.now() + FIVE_MINUTES

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    files.forEach((file) => {
      const record: StoredMediaRecord = {
        id: createId(file),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        kind: getKind(file),
        size: file.size,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAtTime, // Lưu mốc thời gian hết hạn 5 phút
        blob: file,
      }
      saved.push(record)
      store.put(record)
    })

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Cannot save files to local storage'))
    }
  })

  onProgress(82)
  await wait(180)
  onProgress(100)

  return {
    count: saved.length,
    skipped: 0,
    items: saved.map(toMediaItem),
  }
}