import type { NodeProps } from '@xyflow/react'
import type { NoteNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function NoteNodeCard({ data, selected, width, height }: NodeProps<NoteNode>) {
  return (
    <NodeFrame
      typeLabel="笔记"
      accentClassName="bg-[rgba(182,163,122,0.16)] text-[var(--text-secondary)]"
      selected={selected || data.externallySelected}
      resizable={data.externallyResizable}
      width={width}
      height={height}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-6 text-[var(--text-primary)]">{data.title}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Note entry</div>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-strong)]">
            文本
          </span>
        </div>
        {data.description ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        {data.body ? (
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)]">
            {data.body}
          </div>
        ) : null}
      </div>
    </NodeFrame>
  )
}
