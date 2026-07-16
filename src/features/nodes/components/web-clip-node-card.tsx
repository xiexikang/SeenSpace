import type { NodeProps } from '@xyflow/react'
import type { WebNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function WebClipNodeCard({ data, selected }: NodeProps<WebNode>) {
  return (
    <NodeFrame
      typeLabel="网页"
      accentClassName="bg-[rgba(116,146,185,0.16)] text-[var(--text-secondary)]"
      selected={selected || data.externallySelected}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-6 text-[var(--text-primary)]">{data.title}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {data.domain ?? 'Web reference'}
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
            链接
          </span>
        </div>
        {data.description ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-3">
          <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">来源地址</div>
          <div className="truncate text-sm text-[var(--text-primary)]">{data.url ?? 'https://example.com'}</div>
        </div>
      </div>
    </NodeFrame>
  )
}
