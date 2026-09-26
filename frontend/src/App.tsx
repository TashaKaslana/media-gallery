import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TopBar } from '@/components/top-bar'
import GalleryPage from '@/pages/gallery-page'
import UploadPage from '@/pages/upload-page'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="media-gallery-theme">
      <BrowserRouter>
        <div className="min-h-dvh bg-background text-foreground">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(20,184,166,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(244,114,182,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%)]" />
          <TopBar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<GalleryPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="bottom-center" />
      </BrowserRouter>
    </ThemeProvider>
  )
}
