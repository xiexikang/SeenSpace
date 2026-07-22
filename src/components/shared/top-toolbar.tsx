import { Keyboard, Plus, Search } from 'lucide-react'
import { ProjectListToggle } from '../../features/project/components/project-list-toggle'
import type { ProjectViewMode } from '../../types/project'

type TopToolbarProps = {
  rightAction?: 'new-project' | 'workspace'
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  viewMode?: ProjectViewMode
  onViewModeChange?: (mode: ProjectViewMode) => void
  onNewProject?: () => void
  onQuickHelpClick?: () => void
  quickHelpActive?: boolean
}

export function TopToolbar({
  rightAction = 'new-project',
  searchPlaceholder = '搜索画布...',
  searchValue,
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  onNewProject,
  onQuickHelpClick,
  quickHelpActive = false,
}: TopToolbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background-elevated)_82%,transparent)] px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="truncate text-xs text-[var(--text-secondary)]">
          把灵感收进空间，让想法自然连接。
        </div>
        <div className="flex flex-1 flex-col gap-3 lg:max-w-[720px] lg:flex-row lg:items-center lg:justify-end">
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-[var(--text-secondary)] shadow-[var(--shadow-sm)] focus-within:border-[var(--border-strong)] lg:max-w-[400px]">
            <Search className="h-4 w-4" />
            <input
              aria-label="搜索"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="top-toolbar-search-input w-full bg-transparent text-sm placeholder:text-[var(--text-muted)]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {rightAction === 'new-project' ? (
              <>
                <ProjectListToggle mode={viewMode} onChange={(mode) => onViewModeChange?.(mode)} />
                <button
                  type="button"
                  onClick={onNewProject}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--accent-strong)]"
                >
                  <Plus className="h-4 w-4" />
                  新建空间
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onQuickHelpClick}
                aria-haspopup="dialog"
                aria-expanded={quickHelpActive}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--panel-elevated)]"
              >
                <Keyboard className="h-4 w-4" />
                快捷操作
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
