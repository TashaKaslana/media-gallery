import { useState } from 'react'
import { toast } from 'sonner'
import { CopyIcon, CheckIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { deleteMedia, resolveMediaUrl } from '@/lib/api'
import type { MediaItem } from '@/types'

function Preview({ item }: { item: MediaItem }) {
  switch (item.kind) {
    case 'image':
      return (
        <img
          src={resolveMediaUrl(item.fileUrl)}
          alt={item.name}
          className="max-h-[35vh] w-auto max-w-full object-contain"
        />
      )
    case 'video':
      return <video src={resolveMediaUrl(item.fileUrl)} controls className="max-h-[35vh] w-full" />
    case 'audio':
      return <audio src={resolveMediaUrl(item.fileUrl)} controls className="w-full px-6" />
    default:
      return (
        <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
          <KindIcon kind="file" className="size-16" strokeWidth={1.25} />
          <p className="text-sm">Có thể tải xuống để mở tệp này trên thiết bị.</p>
        </div>
      )
  }
}

export function MediaDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: MediaItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (item: MediaItem) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!item) return null

  const fileUrl = resolveMediaUrl(item.fileUrl)
  const isExpired = !fileUrl

  const handleCopyLink = () => {
    if (!fileUrl) return
    navigator.clipboard.writeText(fileUrl)
    setCopied(true)
    toast.success('Đã sao chép link local vào clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const summary = item.metadata.summary
  const rows: Array<[string, string]> = []
  const seen = new Set<string>()
  const pushRow = (label: string, value: string) => {
    if (seen.has(label)) return
    seen.add(label)
    rows.push([label, value])
  }

  if (summary.size != null) pushRow('Dung lượng', formatBytes(summary.size))
  if (summary.duration != null) pushRow('Thời lượng', formatDuration(summary.duration))
  if (summary.bitrate != null) pushRow('Bitrate', formatBitrate(summary.bitrate))
  pushRow('Ngày tải lên', formatDateTime(item.createdAt))
  for (const detail of item.metadata.details) {
    pushRow(detail.label, detail.value)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteMedia(item.id)
      onDeleted(item)
      onOpenChange(false)
      toast.success(`Đã xóa "${item.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa tệp thất bại')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-full overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex flex-col gap-1 px-6 pt-5">
          <DialogHeader className="gap-0.5">
            <DialogTitle className="text-lg">{item.name}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <KindIcon kind={item.kind} className="size-3" />
                {KIND_LABELS[item.kind]}
              </Badge>
              <span>{formatBytes(item.size)}</span>
              <span className="hidden sm:inline">•</span>
              <span>{formatDateTime(item.createdAt)}</span>
              {isExpired && (
                <Badge variant="destructive" className="ml-auto text-[10px]">
                  Link đã hết hạn (Quá 5 phút)
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator />

        <div className="flex flex-col gap-5 px-6 pb-2 lg:flex-row">
          {/* Cột trái: Khung xem trước + Ô chứa Link Local ngay bên dưới */}
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
              <Preview item={item} />
            </div>

            {/* Ô hiển thị Link Local ngay bên dưới để copy / xem trực tiếp */}
            <div className="space-y-1.5 rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Link Local (Blob URL - Hết hạn sau 5 phút)
                </span>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Mở tab mới <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={fileUrl || '⚠️ Link đã hết hạn hoặc bị thu hồi (vượt quá 5 phút)'}
                  className="h-8 font-mono text-xs bg-muted/50 text-muted-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 px-3"
                  onClick={handleCopyLink}
                  disabled={!fileUrl}
                >
                  {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
                  <span className="ml-1.5 text-xs">{copied ? 'Đã chép' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin tệp */}
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Thông tin tệp
            </h3>
            {rows.length > 0 ? (
              <ScrollArea className="max-h-[38dvh] lg:max-h-[43dvh]">
                <dl className="divide-y text-sm">
                  {rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd className="min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có thông tin chi tiết cho tệp này.</p>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 pt-0">
          <Button type="button" variant="outline" asChild disabled={!fileUrl}>
            <a href={fileUrl} download={item.name}>
              Tải xuống
            </a>
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}