import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KindIcon, KIND_LABELS } from '@/components/kind'
import { formatBitrate, formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { deleteMedia, resolveMediaUrl, updateMedia } from '@/lib/api'
import type { MediaItem } from '@/types'

function Preview({ item }: { item: MediaItem }) {
  switch (item.kind) {
    case 'image':
      return (
        <img
          src={resolveMediaUrl(item.fileUrl)}
          alt={item.name}
          className="max-h-[45vh] w-auto max-w-full object-contain"
        />
      )
    case 'video':
      return <video src={resolveMediaUrl(item.fileUrl)} controls className="max-h-[45vh] w-full" />
    case 'audio':
      return <audio src={resolveMediaUrl(item.fileUrl)} controls className="w-full px-6" />
    default:
      return (
        <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
          <KindIcon kind="file" className="size-16" strokeWidth={1.25} />
          <p className="text-sm">Preview not available for this file type.</p>
        </div>
      )
  }
}

export function MediaDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
  onRenamed,
}: {
  item: MediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (item: MediaItem) => void
  onRenamed: (item: MediaItem) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const closingRef = useRef(false)
  const itemKey = item ? `${item.id}:${item.name}` : ''
  const [syncedKey, setSyncedKey] = useState(itemKey)

  if (itemKey !== syncedKey) {
    setSyncedKey(itemKey)
    setRenaming(false)
    setDraft(item?.name ?? '')
    setSaving(false)
  }

  useEffect(() => {
    if (!renaming) {
      closingRef.current = false
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [renaming])

  if (!item) return null

  const summary = item.metadata.summary
  const rows: Array<[string, string]> = []
  const seen = new Set<string>()
  const pushRow = (label: string, value: string) => {
    if (seen.has(label)) return
    seen.add(label)
    rows.push([label, value])
  }

  if (summary.size != null) pushRow('File size', formatBytes(summary.size))
  if (summary.duration != null) pushRow('Duration', formatDuration(summary.duration))
  if (summary.bitrate != null) pushRow('Bitrate', formatBitrate(summary.bitrate))
  pushRow('Uploaded', formatDateTime(item.createdAt))
  for (const detail of item.metadata.details) {
    pushRow(detail.label, detail.value)
  }

  const cancelRename = () => {
    closingRef.current = true
    setDraft(item.name)
    setRenaming(false)
  }

  const saveRename = async () => {
    if (closingRef.current || savingRef.current || !renaming) return
    const name = draft.trim()
    if (!name || name === item.name) {
      cancelRename()
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const updated = await updateMedia(item.id, { name })
      const next = { ...item, name: updated.name }
      onRenamed(next)
      closingRef.current = true
      setRenaming(false)
      toast.success(`Renamed to "${next.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteMedia(item.id)
      onDeleted(item)
      onOpenChange(false)
      toast.success(`Deleted "${item.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-full overflow-hidden p-0 sm:max-w-4xl"
        onEscapeKeyDown={(e) => {
          if (!renaming) return
          e.preventDefault()
          cancelRename()
        }}
      >
        <div className="flex flex-col gap-1 px-6 pt-5">
          <DialogHeader className="gap-0.5">
            <DialogTitle className="pr-8 text-lg">
              {renaming ? (
                <Input
                  ref={inputRef}
                  value={draft}
                  disabled={saving}
                  aria-label="Rename media"
                  className="h-8 text-lg font-medium"
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => void saveRename()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void saveRename()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelRename()
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  title="Rename"
                  className="max-w-full truncate text-left hover:underline"
                  onClick={() => {
                    setDraft(item.name)
                    setRenaming(true)
                  }}
                >
                  {item.name}
                </button>
              )}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <KindIcon kind={item.kind} className="size-3" />
                {KIND_LABELS[item.kind]}
              </Badge>
              <span>{formatBytes(item.size)}</span>
              <span className="hidden sm:inline">·</span>
              <span>Uploaded {formatDateTime(item.createdAt)}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator />

        <div className="flex flex-col gap-5 px-6 pb-2 lg:flex-row">
          <div className="flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
            <Preview item={item} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Metadata
            </h3>
            {rows.length > 0 ? (
              <ScrollArea className="max-h-[38dvh] lg:max-h-[45dvh]">
                <dl className="divide-y text-sm">
                  {rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[10rem_1fr] gap-3 py-2">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd className="min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No metadata available for this file.</p>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 pt-0">
          <Button type="button" variant="outline" asChild>
            <a href={resolveMediaUrl(item.fileUrl)} download={item.name}>
              Download
            </a>
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}