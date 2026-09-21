import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatBytes, formatDuration } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/api'
import { KindIcon, kindGradient, KIND_LABELS } from '@/components/kind'
import type { MediaItem } from '@/types'

function CardThumb({ item }: { item: MediaItem }) {
  const [imageFailed, setImageFailed] = useState(false)

  const duration = item.metadata.summary.duration
  const showImage = item.kind === 'image' && item.thumbnailable && !imageFailed

  return (
    <div className="relative aspect-square overflow-hidden bg-muted">
      {showImage ? (
        <img
          src={resolveMediaUrl(item.thumbnailUrl)}
          alt={item.name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={cn('absolute inset-0 flex items-center justify-center', kindGradient(item.kind))}>
          <KindIcon kind={item.kind} className="size-14 text-white/85" strokeWidth={1.5} />
        </div>
      )}

      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
        {KIND_LABELS[item.kind]}
      </span>

      {duration != null && (
        <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  )
}

export function MediaCard({
  item,
  onSelect,
}: {
  item: MediaItem
  onSelect: (item: MediaItem) => void
}) {
  const sub = item.metadata.summary.width && item.metadata.summary.height
    ? `${item.metadata.summary.width} × ${item.metadata.summary.height}`
    : null

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-square border-b">
        <CardThumb item={item} />
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="truncate text-sm font-semibold group-hover:text-foreground" title={item.name}>
          {item.name}
        </p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {[sub, formatBytes(item.size)].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  )
}