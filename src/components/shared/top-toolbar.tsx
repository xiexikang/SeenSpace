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
  searchPlaceholder = '搜索画布...',
  searchValue,
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  onNewProject,
}: TopToolbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background-elevated)_82%,transparent)] px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            SeenSpace
          </div>
          <div className="truncate text-lg font-semibold text-[var(--text-primary)]">{title}</div>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:max-w-[720px] lg:flex-row lg:items-center lg:justify-end">
          <label className="flex h-11 w-full items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] px-3 text-[var(--text-secondary)] shadow-[var(--shadow-sm)] lg:max-w-[320px]">
            <Search className="h-4 w-4" />
            <input
              aria-label="搜索"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            {rightAction === 'new-project' ? (
              <>
                <ProjectListToggle mode={viewMode} onChange={(mode) => onViewModeChange?.(mode)} />
                <button
                  type="button"
                  onClick={onNewProject}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--accent-strong)]"
                >
                  <Plus className="h-4 w-4" />
                  新建项目
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] shadow-[var(--shadow-sm)] hover:text-[var(--text-primary)]"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] hover:bg-[var(--panel-elevated)]"
                >
                  助手
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
