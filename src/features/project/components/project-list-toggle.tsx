import { Grid2x2, List } from 'lucide-react'
import type { ProjectViewMode } from '../../../types/project'
import { cn } from '../../../lib/utils'

type ProjectListToggleProps = {
  mode: ProjectViewMode
  onChange: (mode: ProjectViewMode) => void
}

export function ProjectListToggle({ mode, onChange }: ProjectListToggleProps) {
  const base =
    'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          base,
          mode === 'grid'
            ? 'border-[var(--border-strong)] bg-[var(--panel-elevated)] text-[var(--text-primary)]'
            : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
        )}
      >
        <Grid2x2 className="h-4 w-4" />
        网格
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          base,
          mode === 'list'
            ? 'border-[var(--border-strong)] bg-[var(--panel-elevated)] text-[var(--text-primary)]'
            : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
        )}
      >
        <List className="h-4 w-4" />
        列表
      </button>
    </div>
  )
}
