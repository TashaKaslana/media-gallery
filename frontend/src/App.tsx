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
        <div className="flex min-h-dvh flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
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