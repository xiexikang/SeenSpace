import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'

type NodeFrameProps = {
  typeLabel: string
  accentClassName: string
  selected?: boolean
  children: ReactNode
}

export function NodeFrame({
  typeLabel,
  accentClassName,
  selected,
  children,
}: NodeFrameProps) {
  return (
    <div
      className={`min-w-[220px] max-w-[300px] rounded-[20px] border bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)] transition-shadow ${
        selected ? 'border-[var(--text-primary)]' : 'border-[var(--border)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${accentClassName}`}
        >
          {typeLabel}
        </span>
      </div>

      {children}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />
    </div>
  )
}
