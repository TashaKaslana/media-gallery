import { useCallback, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { ArrowLeftIcon, CloudUploadIcon, FileUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { KindIcon, KIND_LABELS } from '@/components/kind'
import { formatBytes } from '@/lib/format'
import { uploadFiles } from '@/lib/api'
import type { MediaItem } from '@/types'

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
    setFileName(files.length === 1 ? first.name : `${files.length} files`)
    try {
      const payload = await uploadFiles(files, setProgress)
      setResults((prev) => [...prev, ...payload.items])
      toast.success(`Uploaded ${payload.count} file${payload.count === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-muted-foreground">
          <a href="/">
            <ArrowLeftIcon />
            Back to gallery
          </a>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Upload media</h1>
        <p className="text-sm text-muted-foreground">
          Images, videos and audio — multiple files allowed, up to 1 GB each.
        </p>
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
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40',
        )}
      >
        <CloudUploadIcon className="size-12 text-muted-foreground" strokeWidth={1.25} />
        <div>
          <p className="font-semibold">Drag &amp; drop files here</p>
          <p className="text-sm text-muted-foreground">or click to browse your computer</p>
        </div>
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
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileUpIcon className="size-4 animate-pulse text-primary" />
              Uploading {fileName}…
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Just uploaded
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
                  <a href={`/?item=${item.id}`}>View</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}