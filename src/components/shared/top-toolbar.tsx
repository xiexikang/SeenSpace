import { Plus, Search, Share2 } from 'lucide-react'
import { ProjectListToggle } from '../../features/project/components/project-list-toggle'
import type { ProjectViewMode } from '../../types/project'
import { ThemeToggle } from './theme-toggle'

type TopToolbarProps = {
  title: string
  rightAction?: 'new-project' | 'workspace'
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  viewMode?: ProjectViewMode
  onViewModeChange?: (mode: ProjectViewMode) => void
  onNewProject?: () => void
}

export function TopToolbar({
  title,
  rightAction = 'new-project',
  searchPlaceholder = 'Search canvas...',
  searchValue,
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  onNewProject,
}: TopToolbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-5">
      <div className="w-[220px] text-sm font-semibold text-[var(--text-primary)]">{title}</div>

      <label className="flex h-9 w-full max-w-[240px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 text-[var(--text-secondary)]">
        <Search className="h-4 w-4" />
        <input
          aria-label="Search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
        />
      </label>

      <div className="flex min-w-[220px] items-center justify-end gap-2">
        <ThemeToggle />
        {rightAction === 'new-project' ? (
          <>
            <ProjectListToggle mode={viewMode} onChange={(mode) => onViewModeChange?.(mode)} />
            <button
              type="button"
              onClick={onNewProject}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-[var(--background)]"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--text-primary)]"
            >
              Assistant
            </button>
          </>
        )}
      </div>
    </header>
  )
}
