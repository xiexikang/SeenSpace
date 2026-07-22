export function CanvasLoadingState() {
  return (
    <div
      role="status"
      aria-label="正在加载画板"
      aria-busy="true"
      className="relative h-full min-h-0 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--canvas)] shadow-[var(--shadow-sm)]"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1.25px, transparent 1.25px)',
          backgroundSize: '18px 18px',
        }}
      />

      <div className="absolute left-5 top-5 flex gap-2">
        {[68, 68, 68, 68].map((width, index) => (
          <div
            key={index}
            className="workspace-loading-shimmer h-8 rounded-full border border-[var(--border)] bg-[var(--panel)]"
            style={{ width }}
          />
        ))}
      </div>

      <div className="absolute inset-0">
        <div className="workspace-loading-shimmer absolute left-[12%] top-[24%] h-36 w-56 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)]" />
        <div className="workspace-loading-shimmer absolute left-[43%] top-[42%] hidden h-44 w-64 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] sm:block" />
        <div className="workspace-loading-shimmer absolute right-[8%] top-[16%] hidden h-32 w-52 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)] lg:block" />
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
        正在加载画板...
      </div>
    </div>
  )
}
