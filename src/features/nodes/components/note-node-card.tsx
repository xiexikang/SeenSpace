import type { NodeProps } from '@xyflow/react'
import type { NoteNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function NoteNodeCard({ data, selected }: NodeProps<NoteNode>) {
  return (
    <NodeFrame
      typeLabel="Note"
      accentClassName="bg-[rgba(182,163,122,0.16)] text-[var(--text-secondary)]"
      selected={selected}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-2">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{data.title}</div>
        {data.description ? (
          <p className="text-sm leading-5 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        {data.body ? (
          <div className="rounded-2xl bg-[var(--panel-elevated)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)]">
            {data.body}
          </div>
        ) : null}
      </div>
    </NodeFrame>
  )
}
