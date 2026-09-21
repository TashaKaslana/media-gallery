import { useCallback, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CloudUploadIcon,
  FileUpIcon,
  LockKeyholeIcon,
  RouterIcon,
  ServerIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { KindIcon, KIND_LABELS } from '@/components/kind'
import { formatBytes } from '@/lib/format'
import { uploadFiles } from '@/lib/api'
import type { MediaItem } from '@/types'

const checks = [
  { label: 'Bảo vệ quyền truy cập tệp', icon: LockKeyholeIcon },
  { label: 'Lưu trữ trên hạ tầng cloud', icon: ServerIcon },
  { label: 'Phân phối nội dung tốc độ cao', icon: RouterIcon },
]

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<MediaItem[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const startUpload = useCallback(async (files: File[]) => {
    if (!files.length) return
    setResults([])
    setUploading(true)
    setProgress(0)
    const first = files[0]
    setFileName(files.length === 1 ? first.name : `${files.length} tệp`)
    try {
      const payload = await uploadFiles(files, setProgress)
      setResults((prev) => [...prev, ...payload.items])
      toast.success(`Đã tải lên ${payload.count} tệp`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploading(false)
      setFileName(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    void startUpload(Array.from(e.dataTransfer.files))
  }

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    void startUpload(Array.from(e.target.files ?? []))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground">
            <a href="/">
              <ArrowLeftIcon className="size-4" />
              Quay lại thư viện
            </a>
          </Button>
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Media Cloud Storage</Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tải tệp phương tiện lên hệ thống</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Thêm hình ảnh, video, âm thanh và tài liệu vào thư viện để quản lý tập trung,
              chia sẻ an toàn và truy cập nhanh trên nhiều thiết bị.
            </p>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'group flex min-h-[360px] cursor-pointer flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
            dragging
              ? 'border-primary bg-primary/10 shadow-lg'
              : 'border-border bg-card hover:border-primary/60 hover:bg-accent/30',
          )}
        >
          <div className="grid size-20 place-items-center rounded-2xl border bg-background shadow-sm transition-transform group-hover:-translate-y-1">
            <CloudUploadIcon className="size-10 text-primary" strokeWidth={1.4} />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold">Kéo thả tệp vào đây</p>
            <p className="text-sm text-muted-foreground">
              Hỗ trợ hình ảnh, video, âm thanh và nhiều tệp cùng lúc
            </p>
          </div>
          <Button type="button" size="lg">
            Chọn tệp từ máy
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            hidden
            onChange={onBrowse}
          />
        </div>

        {uploading && (
          <Card>
            <CardContent className="grid gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <FileUpIcon className="size-4 animate-pulse text-primary" />
                  <span className="truncate">Đang tải {fileName}...</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Vừa tải lên
            </h2>
            {results.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted">
                    <KindIcon kind={item.kind} className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>{KIND_LABELS[item.kind]}</span>
                      <span>{formatBytes(item.size)}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/?item=${item.id}`}>Xem</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-1 font-semibold">Tính năng lưu trữ</h2>
          <p className="mb-4 text-sm text-muted-foreground">Các lớp xử lý giúp tệp luôn an toàn và dễ truy cập.</p>
          <div className="space-y-3">
            {checks.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border bg-background/55 p-3">
                <Icon className="size-4 text-primary" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <CheckCircle2Icon className="size-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="font-semibold">Chính sách hệ thống</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Policy label="Truy cập" value="Chia sẻ có kiểm soát" />
            <Policy label="Kho lưu trữ" value="Riêng tư theo mặc định" />
            <Policy label="Vòng đời tệp" value="Tự động tối ưu chi phí" />
            <Policy label="Phân phối" value="Tăng tốc qua CDN" />
          </div>
        </div>
      </aside>
    </div>
  )
}

function Policy({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-44 text-right font-medium">{value}</span>
    </div>
  )
}
