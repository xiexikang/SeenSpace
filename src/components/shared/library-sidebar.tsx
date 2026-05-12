import { FolderOpen, Image, NotebookPen, Settings, Star, Trash2, Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

const primaryItems = [
  { label: 'All Notes', icon: NotebookPen, active: true },
  { label: 'Images', icon: Image },
  { label: 'Web Clips', icon: Globe },
  { label: 'Favorites', icon: Star },
]

const secondaryItems = [
  { label: 'Settings', icon: Settings },
  { label: 'Trash', icon: Trash2 },
]

export function LibrarySidebar() {
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
      <div className="px-5 pb-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--panel-elevated)] text-[var(--text-primary)]">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--text-primary)]">Library</div>
            <div className="text-xs text-[var(--text-secondary)]">Inspiration</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {primaryItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--panel-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-1 border-t border-[var(--border)] p-3">
        {secondaryItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
