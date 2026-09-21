import type { ComponentProps } from 'react'
import { FileIcon, FilmIcon, ImageIcon, MusicIcon, type LucideIcon } from 'lucide-react'
import type { MediaKind } from '@/types'

export const KIND_ICONS: Record<MediaKind, LucideIcon> = {
  image: ImageIcon,
  video: FilmIcon,
  audio: MusicIcon,
  file: FileIcon,
}

export const KIND_LABELS: Record<MediaKind, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  file: 'File',
}

const KIND_GRADIENTS: Record<MediaKind, string> = {
  image: 'bg-gradient-to-br from-blue-500/50 to-violet-500/50',
  video: 'bg-gradient-to-br from-rose-500/50 to-orange-500/50',
  audio: 'bg-gradient-to-br from-emerald-500/50 to-teal-500/50',
  file: 'bg-gradient-to-br from-slate-500/50 to-slate-600/50',
}

export function kindGradient(kind: MediaKind): string {
  return KIND_GRADIENTS[kind] ?? KIND_GRADIENTS.file
}

export function KindIcon({
  kind,
  ...props
}: { kind: MediaKind } & ComponentProps<LucideIcon>) {
  const Icon = KIND_ICONS[kind] ?? FileIcon
  return <Icon data-slot="kind-icon" {...props} />
}