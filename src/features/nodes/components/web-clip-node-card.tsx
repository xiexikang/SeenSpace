import type { NodeProps } from '@xyflow/react'
import type { WebNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function WebClipNodeCard({ data, selected }: NodeProps<WebNode>) {
  return (
    <NodeFrame
      typeLabel="Web Clip"
      accentClassName="bg-[rgba(116,146,185,0.16)] text-[var(--text-secondary)]"
      selected={selected}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-2">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{data.title}</div>
        {data.description ? (
          <p className="text-sm leading-5 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <div className="mb-1 text-xs text-[var(--text-muted)]">{data.domain ?? 'website'}</div>
          <div className="truncate text-sm text-[var(--text-primary)]">{data.url ?? 'https://example.com'}</div>
        </div>
      </div>
    </NodeFrame>
  )
}
