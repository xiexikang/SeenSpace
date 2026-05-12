import { Plus } from 'lucide-react'

export function CanvasEmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)]">
          <Plus className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">Blank Canvas</h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Drag or paste inspiration here to start building your project. Double-click anywhere to add text.
        </p>
      </div>
    </div>
  )
}
