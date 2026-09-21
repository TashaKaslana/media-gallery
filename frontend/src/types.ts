export type MediaKind = 'image' | 'video' | 'audio' | 'file'

export interface MediaSummary {
  size?: number
  duration?: number
  bitrate?: number
  width?: number
  height?: number
  title?: string
  camera?: string
  thumbFailed?: boolean
}

export interface MediaDetail {
  label: string
  value: string
}

export interface MediaMetadata {
  kind: MediaKind
  summary: MediaSummary
  details: MediaDetail[]
}

export interface MediaItem {
  id: string
  name: string
  mimeType: string
  kind: MediaKind
  size: number
  createdAt: string
  thumbnailable: boolean
  metadata: MediaMetadata
  fileUrl: string
  thumbnailUrl: string
}

export interface UploadResponse {
  count: number
  skipped: number
  items: MediaItem[]
}