import { Maximize2, Minus, Plus } from 'lucide-react'

type ZoomControlsProps = {
  zoomLabel?: string
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
}

export function ZoomControls({
  zoomLabel = '100%',
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  return (
    <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 shadow-[var(--shadow-sm)]">
      <button
        type="button"
        onClick={onZoomOut}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-8 items-center justify-center rounded-full px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Maximize2 className="mr-1 h-3.5 w-3.5" />
        {zoomLabel}
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
