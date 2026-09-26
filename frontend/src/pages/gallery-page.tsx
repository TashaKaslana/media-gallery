import { useEffect, useMemo, useState } from 'react'
import { SearchIcon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, MediaGrid, MediaGridSkeleton } from '@/components/media-grid'
import { MediaDialog } from '@/components/media-dialog'
import { useMedia } from '@/hooks/use-media'
import type { MediaItem, MediaKind } from '@/types'

type KindFilter = 'all' | MediaKind

const KIND_FILTER_LABELS: Record<KindFilter, string> = {
  all: 'All media',
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  file: 'Files',
}

export default function GalleryPage() {
  const { items, loading, error, remove, reload, replace } = useMedia()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [selected, setSelected] = useState<MediaItem | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false
      if (q && !item.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, query, kind])

  const isFiltering = kind !== 'all' || query.trim() !== ''

  useEffect(() => {
    if (loading || selected !== null) return
    const itemId = new URLSearchParams(window.location.search).get('item')
    if (itemId) {
      const target = items.find((item) => item.id === itemId)
      if (target) setSelected(target)
    }
  }, [items, loading, selected])

  const clearFilters = () => {
    setKind('all')
    setQuery('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media gallery</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} items`}
          </p>
        </div>
        <Button asChild>
          <a href="/upload">
            <UploadIcon />
            Upload media
          </a>
        </Button>
      </div>

      {!loading && !error && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
            <SelectTrigger size="default" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_FILTER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      )}

      <ErrorState error={error} onRetry={() => void reload()} />

      {!error && loading && <MediaGridSkeleton />}

      {!error && !loading && filtered.length === 0 && (
        <EmptyState
          message={
            isFiltering
              ? 'No media matches your current filters.'
              : 'Your gallery is empty. Upload some media to get started.'
          }
          onReset={isFiltering ? clearFilters : undefined}
        />
      )}

      {!error && !loading && filtered.length > 0 && (
        <MediaGrid items={filtered} onSelect={setSelected} />
      )}

      <MediaDialog
        item={selected}
        open={selected !== null}
        onOpenChange={(openValue) => {
          if (!openValue) setSelected(null)
        }}
        onDeleted={() => {
          remove(selected!.id)
        }}
        onRenamed={(updated) => {
          replace(updated)
          setSelected(updated)
        }}
      />
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">{error}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}