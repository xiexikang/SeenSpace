import type { NodeProps } from '@xyflow/react'
import type { ImageNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function ImageNodeCard({ data, selected }: NodeProps<ImageNode>) {
  return (
    <NodeFrame
      typeLabel="图片"
      accentClassName="bg-[rgba(125,170,151,0.18)] text-[var(--text-secondary)]"
      selected={selected || data.externallySelected}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,40,75,0.08),rgba(227,255,127,0.22),rgba(237,240,243,0.92))]">
          <div className="flex items-center justify-between border-b border-white/60 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            <span>Image pin</span>
            <span>{data.palette ? '已标注色彩' : '待补充'}</span>
          </div>
          <div className="p-3">
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
        </div>
        <div className="text-base font-semibold leading-6 text-[var(--text-primary)]">{data.title}</div>
        {data.description ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{data.description}</p>
        ) : null}
        {data.palette ? (
          <div className="rounded-full bg-[var(--panel-soft)] px-3 py-1 text-xs text-[var(--text-muted)]">
            色彩：{data.palette}
          </div>
        ) : null}
      </div>
    </NodeFrame>
  )
}
