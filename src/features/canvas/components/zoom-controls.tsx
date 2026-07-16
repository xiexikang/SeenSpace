import { Grid2x2, Maximize2, Minus, Plus } from 'lucide-react'

type ZoomControlsProps = {
  zoomLabel?: string
  snapEnabled?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
  onToggleSnap?: () => void
}

export function ZoomControls({
  zoomLabel = '100%',
  snapEnabled = true,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleSnap,
}: ZoomControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--panel)_92%,white_8%)] px-2 py-1.5 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggleSnap}
        className={`inline-flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-medium transition-colors ${
          snapEnabled
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Grid2x2 className="mr-1 h-3 w-3" />
        吸附
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-7 items-center justify-center rounded-full px-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Maximize2 className="mr-1 h-3 w-3" />
        {zoomLabel}
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
