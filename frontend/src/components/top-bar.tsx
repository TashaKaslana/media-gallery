import { Link, NavLink } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { ImagesIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Gallery' },
  { to: '/upload', label: 'Upload' },
]

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ImagesIcon className="size-4" />
          </span>
          <span>Media Gallery</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}