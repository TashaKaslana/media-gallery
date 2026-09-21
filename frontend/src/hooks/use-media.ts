import { useCallback, useEffect, useState } from 'react'
import { getMedia } from '@/lib/api'
import type { MediaItem } from '@/types'

export function useMedia() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getMedia())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const add = useCallback((newItems: MediaItem[]) => {
    setItems((prev) => [...newItems, ...prev])
  }, [])

  return { items, loading, error, reload, remove, add }
}