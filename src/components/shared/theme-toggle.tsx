import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/use-theme'
import { cn } from '../../lib/utils'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
        'border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] hover:bg-[var(--panel-elevated)]',
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  )
}
