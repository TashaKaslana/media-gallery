import { Link, NavLink } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { CloudIcon, MoonIcon, ShieldCheckIcon, SunIcon, UploadCloudIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Thư viện' },
  { to: '/upload', label: 'Tải lên' },
]

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 font-semibold">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CloudIcon className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate leading-5">Media Cloud Storage</span>
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              Quản lý và chia sẻ tệp phương tiện
            </span>
          </span>
        </Link>

        <nav className="ml-0 hidden items-center gap-1 rounded-full border bg-card/70 p-1 shadow-sm md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:flex">
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
            Chia sẻ an toàn
          </div>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/upload">
              <UploadCloudIcon className="size-4" />
              Upload
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Đổi giao diện sáng tối"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
