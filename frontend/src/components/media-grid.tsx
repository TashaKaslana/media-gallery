import { Skeleton } from '@/components/ui/skeleton'
import { MediaCard } from '@/components/media-card'
import type { MediaItem } from '@/types'

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-1.5 p-3">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ message, onReset }: { message: string; onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-20 text-center">
      <p className="text-muted-foreground">{message}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

export function MediaGrid({
  items,
  onSelect,
}: {
  items: MediaItem[]
  onSelect: (item: MediaItem) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}