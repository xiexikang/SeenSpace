import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Globe, ImageIcon, NotebookPen } from 'lucide-react'
import type { WorkspaceNode } from '../../../types/workspace'

const iconByType = {
  note: NotebookPen,
  web: Globe,
  image: ImageIcon,
}

export function WorkspaceNodeCard({
  data,
  type = 'note',
  selected,
}: NodeProps<WorkspaceNode>) {
  const Icon = iconByType[type as keyof typeof iconByType] ?? NotebookPen

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-[20px] border bg-[var(--panel)] p-3 shadow-[var(--shadow-sm)] transition-shadow ${
        selected ? 'border-[var(--text-primary)]' : 'border-[var(--border)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />

      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        <Icon className="h-3.5 w-3.5" />
        <span>{type}</span>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{data.title}</div>
        {data.description ? (
          <p className="text-sm leading-5 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        {data.meta ? <div className="pt-1 text-xs text-[var(--text-muted)]">{data.meta}</div> : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />
    </div>
  )
}
