import type { NodeProps } from '@xyflow/react'
import type { AiInsightNode } from '../../../types/workspace'
import { NodeFrame } from './node-frame'

export function AiInsightNodeCard({ data, selected, width, height }: NodeProps<AiInsightNode>) {
  return (
    <NodeFrame
      typeLabel="AI 洞察"
      accentClassName="bg-[rgba(141,122,182,0.16)] text-[var(--text-secondary)]"
      selected={selected || data.externallySelected}
      resizable={data.externallyResizable}
      width={width}
      height={height}
      edgeFocusRole={data.edgeFocusRole}
      groupLabel={data.groupCollapsed ? data.groupLabel : undefined}
      collapsedGroupSummary={data.groupCollapsed ? data.collapsedGroupSummary : undefined}
    >
      <div className="space-y-3">
        <div className="rounded-[18px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,40,75,0.05),rgba(255,255,255,0.92))] p-3">
          <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">Insight extract</div>
          <div className="text-base font-semibold leading-6 text-[var(--text-primary)]">{data.title}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{data.summary}</p>
        </div>

        {data.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-[var(--border)] bg-[var(--panel-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs leading-5 text-[var(--text-muted)]">
          范围：{data.scope === 'selection' ? `${data.sourceNodeIds.length} 个选中节点` : '整张画布'}
        </div>
      </div>
    </NodeFrame>
  )
}
