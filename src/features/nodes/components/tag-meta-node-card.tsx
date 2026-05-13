import type { NodeProps } from '@xyflow/react'
import type { TagMetaNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function TagMetaNodeCard({ data, selected }: NodeProps<TagMetaNode>) {
  return (
    <NodeFrame
      typeLabel="Tag / Meta"
      accentClassName="bg-[rgba(171,145,194,0.16)] text-[var(--text-secondary)]"
      selected={selected}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{data.title}</div>
          {data.description ? (
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{data.description}</p>
          ) : null}
        </div>

        {data.category ? (
          <div className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {data.category}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {(data.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-[var(--panel-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </NodeFrame>
  )
}
