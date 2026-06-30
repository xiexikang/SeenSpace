import { Grid2x2, List } from 'lucide-react'
import type { ProjectViewMode } from '../../../types/project'
import { cn } from '../../../lib/utils'

type ProjectListToggleProps = {
  mode: ProjectViewMode
  onChange: (mode: ProjectViewMode) => void
}

export function ProjectListToggle({ mode, onChange }: ProjectListToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
      {[
        { id: 'grid' as const, label: '网格', icon: Grid2x2 },
        { id: 'list' as const, label: '列表', icon: List },
      ].map((item) => {
        const Icon = item.icon

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex h-8 min-w-[72px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
              mode === item.id
                ? 'bg-[var(--panel-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
