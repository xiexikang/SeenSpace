import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Globe, Image as ImageIcon, NotebookText, Tags } from 'lucide-react'
import type { CollapsedGroupSummary } from '../../../types/workspace'

type NodeFrameProps = {
  typeLabel: string
  accentClassName: string
  selected?: boolean
  groupLabel?: string
  collapsedGroupSummary?: CollapsedGroupSummary
  children: ReactNode
}

export function NodeFrame({
  typeLabel,
  accentClassName,
  selected,
  groupLabel,
  collapsedGroupSummary,
  children,
}: NodeFrameProps) {
  const typeIconByKey = {
    note: NotebookText,
    image: ImageIcon,
    web: Globe,
    tag_meta: Tags,
  } as const
  const isCollapsedGroupCard = Boolean(collapsedGroupSummary)

  return (
    <div className="group/node relative">
      {isCollapsedGroupCard ? (
        <>
          <div className="pointer-events-none absolute inset-x-3 bottom-0 top-2 rounded-[20px] border border-[rgba(24,24,27,0.08)] bg-[rgba(255,255,255,0.58)] shadow-[0_12px_26px_rgba(24,24,27,0.05)]" />
          <div className="pointer-events-none absolute inset-x-1.5 bottom-0 top-1 rounded-[20px] border border-[rgba(24,24,27,0.1)] bg-[rgba(255,255,255,0.78)] shadow-[0_14px_30px_rgba(24,24,27,0.06)]" />
        </>
      ) : null}

      <div
        className={`relative min-w-[220px] max-w-[300px] rounded-[20px] border bg-[var(--panel)] p-3 transition-all ${
          selected
            ? 'border-[var(--text-primary)] shadow-[0_0_0_2px_rgba(24,24,27,0.08),0_18px_42px_rgba(24,24,27,0.14)]'
            : isCollapsedGroupCard
              ? 'border-[rgba(24,24,27,0.12)] shadow-[0_18px_38px_rgba(24,24,27,0.12)]'
              : 'border-[var(--border)] shadow-[var(--shadow-sm)]'
        }`}
      >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${accentClassName}`}
        >
          {typeLabel}
        </span>
        {groupLabel ? (
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
            {groupLabel}
          </span>
        ) : null}
      </div>

      {collapsedGroupSummary ? (
        <div className="mb-3 rounded-[18px] border border-[rgba(24,24,27,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,246,248,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Collapsed Group
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {collapsedGroupSummary.memberCount} items
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {collapsedGroupSummary.typeLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {collapsedGroupSummary.typeCounts.map(({ type, count }) => {
              const Icon = typeIconByKey[type]
              return (
                <div
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{count}</span>
                </div>
              )
            })}
          </div>
          {collapsedGroupSummary.previewItems.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Peek
                  </div>
                  <div className="truncate text-sm text-[var(--text-secondary)]">
                    {collapsedGroupSummary.previewItems[0]?.title}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] transition-transform duration-150 group-hover/node:-translate-y-0.5">
                  Hover
                </div>
              </div>

              <div className="pointer-events-none absolute left-full top-6 z-30 ml-3 w-[260px] origin-left rounded-[18px] border border-[rgba(24,24,27,0.1)] bg-[rgba(255,255,255,0.97)] p-3 opacity-0 shadow-[0_18px_40px_rgba(24,24,27,0.14)] backdrop-blur-sm transition-all duration-150 group-hover/node:translate-x-0 group-hover/node:opacity-100 group-hover/node:shadow-[0_22px_46px_rgba(24,24,27,0.18)] sm:w-[280px] translate-x-1">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Group Preview
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {collapsedGroupSummary.memberCount} items
                  </div>
                </div>
                <div className="space-y-2">
                  {collapsedGroupSummary.previewItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {item.title}
                        </div>
                        <div className="shrink-0 text-[11px] text-[var(--text-muted)]">
                          {item.typeLabel}
                        </div>
                      </div>
                      {item.subtitle ? (
                        <div className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                          {item.subtitle}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {children}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--text-muted)]"
      />
      </div>
    </div>
  )
}
