import type { NodeProps } from '@xyflow/react'
import type { TagMetaNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function TagMetaNodeCard({ data, selected, width, height }: NodeProps<TagMetaNode>) {
  return (
    <NodeFrame
      typeLabel="标签 / 元信息"
      accentClassName="bg-[rgba(171,145,194,0.16)] text-[var(--text-secondary)]"
      selected={selected || data.externallySelected}
      resizable={data.externallyResizable}
      width={width}
      height={height}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div>
          <div className="text-base font-semibold leading-6 text-[var(--text-primary)]">{data.title}</div>
          {data.description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{data.description}</p>
          ) : null}
        </div>

        {data.category ? (
          <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--accent-strong)]">
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
