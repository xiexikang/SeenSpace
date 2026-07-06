type LightToastProps = {
  message: string | null
}

export function LightToast({ message }: LightToastProps) {
  if (!message) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2">
      <div className="rounded-full border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--panel)_90%,white_10%)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-lg)] backdrop-blur-xl">
        {message}
      </div>
    </div>
  )
}
