import { Plus } from 'lucide-react'

type CanvasEmptyStateProps = {
  onAddNote?: () => void
}

export function CanvasEmptyState({ onAddNote }: CanvasEmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-sm text-center">
        <button
          type="button"
          onClick={onAddNote}
          className="pointer-events-auto mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)]"
        >
          <Plus className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">空白画布</h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          把灵感拖进来或直接粘贴到这里，开始搭建你的项目。
        </p>
      </div>
    </div>
  )
}
