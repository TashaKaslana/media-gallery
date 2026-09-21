import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIcon,
  ArchiveIcon,
  GaugeIcon,
  Globe2Icon,
  HardDriveIcon,
  SearchIcon,
  ShieldCheckIcon,
  UploadIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState, MediaGrid, MediaGridSkeleton } from '@/components/media-grid'
import { MediaDialog } from '@/components/media-dialog'
import { useMedia } from '@/hooks/use-media'
import { formatBytes } from '@/lib/format'
import type { MediaItem, MediaKind } from '@/types'

type KindFilter = 'all' | MediaKind

const KIND_FILTER_LABELS: Record<KindFilter, string> = {
  all: 'Tất cả phương tiện',
  image: 'Hình ảnh',
  video: 'Video',
  audio: 'Âm thanh',
  file: 'Tệp khác',
}

const pipeline = [
  { label: 'Kiểm soát truy cập', value: 'Riêng tư', tone: 'text-emerald-500' },
  { label: 'Kho lưu trữ', value: 'Sẵn sàng', tone: 'text-cyan-500' },
  { label: 'Mạng phân phối', value: 'Tối ưu', tone: 'text-orange-500' },
  { label: 'Lưu trữ dài hạn', value: 'Tự động', tone: 'text-violet-500' },
]

export default function GalleryPage() {
  const { items, loading, error, remove, reload } = useMedia()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [selected, setSelected] = useState<MediaItem | null>(null)

  const stats = useMemo(() => {
    const totalSize = items.reduce((sum, item) => sum + item.size, 0)
    const videos = items.filter((item) => item.kind === 'video').length
    const images = items.filter((item) => item.kind === 'image').length
    return { totalSize, videos, images }
  }, [items])

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_260px] md:p-6">
            <div className="space-y-5">
              <div className="space-y-3">
                <Badge variant="secondary" className="w-fit gap-1.5">
                  <Globe2Icon className="size-3.5" />
                  Media Cloud Storage
                </Badge>
                <div className="space-y-2">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    Xây dựng ứng dụng quản lý và chia sẻ tệp phương tiện đa phương tiện
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Không gian làm việc tập trung để lưu trữ, tổ chức, xem trước và chia sẻ hình ảnh,
                    video, âm thanh cùng tài liệu trong một hệ thống media cloud hiện đại.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Tổng dung lượng" value={formatBytes(stats.totalSize)} icon={HardDriveIcon} />
                <Metric label="Tệp đã lưu trữ" value={String(items.length)} icon={ArchiveIcon} />
                <Metric label="Hiệu suất phân phối" value="92%" icon={GaugeIcon} />
              </div>
            </div>

            <div className="rounded-lg border bg-background/55 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Quy trình xử lý tệp</p>
                  <p className="text-xs text-muted-foreground">Bảo mật, lưu trữ và phân phối</p>
                </div>
                <ActivityIcon className="size-5 text-primary" />
              </div>
              <div className="space-y-3">
                {pipeline.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-full border bg-card text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className={`text-xs font-medium ${item.tone}`}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Thư viện phương tiện</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Đang tải...' : `${filtered.length} / ${items.length} mục đang hiển thị`}
              </p>
            </div>
            <Button asChild>
              <a href="/upload">
                <UploadIcon className="size-4" />
                Tải tệp lên
              </a>
            </Button>
          </div>

          {!loading && !error && (
            <form className="mb-5 flex flex-wrap items-center gap-2" onSubmit={(e) => e.preventDefault()}>
              <div className="relative min-w-56 flex-1">
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm tệp phương tiện..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
                <SelectTrigger size="default" className="h-10 w-44">
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
              message={isFiltering ? 'Không có tệp nào khớp bộ lọc.' : 'Thư viện đang trống. Hãy tải tệp đầu tiên.'}
              onReset={isFiltering ? clearFilters : undefined}
            />
          )}
          {!error && !loading && filtered.length > 0 && <MediaGrid items={filtered} onSelect={setSelected} />}
        </div>
      </section>

      <aside className="space-y-4">
        <StatusCard
          title="Bảo mật chia sẻ"
          icon={ShieldCheckIcon}
          rows={[
            ['Liên kết chia sẻ', 'Có thời hạn'],
            ['Không gian lưu trữ', 'Riêng tư'],
            ['Quyền truy cập', 'Theo từng tệp'],
          ]}
        />
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Phân tầng lưu trữ</h3>
              <p className="text-xs text-muted-foreground">Tối ưu chi phí theo vòng đời tệp</p>
            </div>
            <ArchiveIcon className="size-5 text-primary" />
          </div>
          <div className="space-y-4">
            <StorageBar label="Standard" value={68} />
            <StorageBar label="Infrequent Access" value={22} />
            <StorageBar label="Glacier" value={10} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Ảnh" value={stats.images} />
          <MiniStat label="Video" value={stats.videos} />
        </div>
      </aside>

      <MediaDialog
        item={selected}
        open={selected !== null}
        onOpenChange={(openValue) => {
          if (!openValue) setSelected(null)
        }}
        onDeleted={() => {
          remove(selected!.id)
        }}
      />
    </div>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof HardDriveIcon }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <Icon className="mb-3 size-5 text-primary" />
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatusCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string
  icon: typeof ShieldCheckIcon
  rows: [string, string][]
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Icon className="size-5 text-emerald-500" />
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StorageBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
      <p className="text-sm font-medium text-destructive">{error}</p>
      <Button variant="outline" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  )
}
