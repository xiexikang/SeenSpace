import { Minus, Plus } from 'lucide-react'

type ZoomControlsProps = {
  zoomLabel?: string
}

export function ZoomControls({ zoomLabel = '100%' }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 shadow-[var(--shadow-sm)]">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-10 text-center text-xs font-medium text-[var(--text-secondary)]">{zoomLabel}</span>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
