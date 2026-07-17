import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Globe, Image as ImageIcon, NotebookText, Sparkles, Tags } from 'lucide-react'
import type { CollapsedGroupSummary } from '../../../types/workspace'

type NodeFrameProps = {
  typeLabel: string
  accentClassName: string
  selected?: boolean
  edgeFocusRole?: 'source' | 'target'
  groupLabel?: string
  collapsedGroupSummary?: CollapsedGroupSummary
  children: ReactNode
}

export function NodeFrame({
  typeLabel,
  accentClassName,
  selected,
  edgeFocusRole,
  groupLabel,
  collapsedGroupSummary,
  children,
}: NodeFrameProps) {
  const typeIconByKey = {
    note: NotebookText,
    image: ImageIcon,
    web: Globe,
    tag_meta: Tags,
    ai_insight: Sparkles,
  } as const
  const isCollapsedGroupCard = Boolean(collapsedGroupSummary)
  const edgeFocusAccent =
    edgeFocusRole === 'source'
      ? 'border-[rgba(116,146,185,0.45)] shadow-[0_0_0_3px_rgba(116,146,185,0.14),0_18px_42px_rgba(24,24,27,0.14)]'
      : edgeFocusRole === 'target'
        ? 'border-[rgba(125,170,151,0.48)] shadow-[0_0_0_3px_rgba(125,170,151,0.16),0_18px_42px_rgba(24,24,27,0.14)]'
        : ''
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [peekSide, setPeekSide] = useState<'left' | 'right'>('right')

  const handlePeekPointerEnter = useCallback(() => {
    if (!frameRef.current || typeof window === 'undefined') return

    const rect = frameRef.current.getBoundingClientRect()
    const peekWidth = window.innerWidth >= 640 ? 280 : 260
    const gap = 12
    const rightSpace = window.innerWidth - rect.right
    const leftSpace = rect.left

    if (rightSpace < peekWidth + gap && leftSpace > rightSpace) {
      setPeekSide('left')
      return
    }

    setPeekSide('right')
  }, [])

  return (
    <div className="group/node relative">
      {isCollapsedGroupCard ? (
        <>
          <div className="pointer-events-none absolute inset-x-3 bottom-0 top-2 rounded-[20px] border border-[rgba(24,24,27,0.08)] bg-[rgba(255,255,255,0.58)] shadow-[0_12px_26px_rgba(24,24,27,0.05)]" />
          <div className="pointer-events-none absolute inset-x-1.5 bottom-0 top-1 rounded-[20px] border border-[rgba(24,24,27,0.1)] bg-[rgba(255,255,255,0.78)] shadow-[0_14px_30px_rgba(24,24,27,0.06)]" />
        </>
      ) : null}

      <div
        ref={frameRef}
        className={`relative min-w-[236px] max-w-[308px] rounded-[22px] border bg-[var(--panel)] p-3 transition-all ${
          selected
            ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(255,40,75,0.14),0_18px_42px_rgba(24,24,27,0.14)]'
            : edgeFocusAccent
              ? edgeFocusAccent
              : isCollapsedGroupCard
              ? 'border-[rgba(24,24,27,0.12)] shadow-[0_18px_38px_rgba(24,24,27,0.12)]'
              : 'border-[var(--border)] shadow-[var(--shadow-sm)]'
        }`}
      >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-[22px] bg-[linear-gradient(180deg,rgba(255,40,75,0.05),transparent)]" />
      <Handle
        type="target"
        position={Position.Left}
        className="!z-20 !h-4 !w-4 !border-2 !border-[var(--panel)] !bg-[var(--text-muted)] transition-colors hover:!bg-[var(--accent)]"
      />

      <div className="relative mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${accentClassName}`}
          >
            {typeLabel}
          </span>
          {edgeFocusRole ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${
                edgeFocusRole === 'source'
                  ? 'bg-[rgba(116,146,185,0.16)] text-[var(--text-secondary)]'
                  : 'bg-[rgba(125,170,151,0.16)] text-[var(--text-secondary)]'
              }`}
            >
              {edgeFocusRole === 'source' ? '来源' : '目标'}
            </span>
          ) : null}
        </div>
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
              已折叠分组
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {collapsedGroupSummary.memberCount} 项
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
            <div className="mt-3" onPointerEnter={handlePeekPointerEnter}>
              <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    预览
                  </div>
                  <div className="truncate text-sm text-[var(--text-secondary)]">
                    {collapsedGroupSummary.previewItems[0]?.title}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] transition-transform duration-150 group-hover/node:-translate-y-0.5">
                  悬停
                </div>
              </div>

              <div
                className={`pointer-events-none absolute top-6 z-30 w-[260px] rounded-[18px] border border-[rgba(24,24,27,0.1)] bg-[rgba(255,255,255,0.97)] p-3 opacity-0 shadow-[0_18px_40px_rgba(24,24,27,0.14)] backdrop-blur-sm transition-all duration-150 group-hover/node:opacity-100 group-hover/node:shadow-[0_22px_46px_rgba(24,24,27,0.18)] sm:w-[280px] ${
                  peekSide === 'left'
                    ? 'right-full mr-3 origin-right -translate-x-1 group-hover/node:translate-x-0'
                    : 'left-full ml-3 origin-left translate-x-1 group-hover/node:translate-x-0'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    分组预览
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {collapsedGroupSummary.memberCount} 项
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

      <div className="relative">{children}</div>

      <Handle
        type="source"
        position={Position.Right}
        className="!z-20 !h-4 !w-4 !border-2 !border-[var(--panel)] !bg-[var(--text-muted)] transition-colors hover:!bg-[var(--accent)]"
      />
      </div>
    </div>
  )
}
