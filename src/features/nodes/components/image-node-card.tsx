import type { NodeProps } from '@xyflow/react'
import type { ImageNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function ImageNodeCard({ data, selected }: NodeProps<ImageNode>) {
  return (
    <NodeFrame
      typeLabel="Image"
      accentClassName="bg-[rgba(125,170,151,0.18)] text-[var(--text-secondary)]"
      selected={selected}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div className="rounded-[18px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(182,196,210,0.36),rgba(237,240,243,0.92))] p-3">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.title}
              className="aspect-[4/3] w-full rounded-[14px] border border-[rgba(255,255,255,0.3)] object-cover"
            />
          ) : (
            <div className="aspect-[4/3] rounded-[14px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.28)]" />
          )}
        </div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{data.title}</div>
        {data.description ? (
          <p className="text-sm leading-5 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        {data.palette ? <div className="text-xs text-[var(--text-muted)]">Palette: {data.palette}</div> : null}
      </div>
    </NodeFrame>
  )
}
