import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowRight,
  BetweenHorizonalStart,
  BetweenVerticalStart,
  Copy,
  FolderInput,
  FolderOpen,
  Info,
  Layers3,
  Maximize2,
  Minimize2,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { WorkspaceEdge, WorkspaceNode } from '../../types/workspace'
import { relationshipPresets } from '../../features/workspace/services/workspace-edges'

const layoutActions = [
  { id: 'align-left', label: '左对齐', icon: AlignStartVertical },
  { id: 'align-center-x', label: '水平居中', icon: AlignCenterVertical },
  { id: 'align-right', label: '右对齐', icon: AlignEndVertical },
  { id: 'align-top', label: '顶部对齐', icon: AlignStartHorizontal },
  { id: 'align-center-y', label: '垂直居中', icon: AlignCenterHorizontal },
  { id: 'align-bottom', label: '底部对齐', icon: AlignEndHorizontal },
  { id: 'distribute-x', label: '水平分布', icon: BetweenHorizonalStart },
  { id: 'distribute-y', label: '垂直分布', icon: BetweenVerticalStart },
] as const

type LayoutActionId = (typeof layoutActions)[number]['id']

const nodeTypeLabels: Record<WorkspaceNode['type'], string> = {
  note: '笔记',
  web: '网页',
  image: '图片',
  tag_meta: '标签',
  ai_insight: 'AI 洞察',
}

const fieldClassName =
  'w-full rounded-[18px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]'

const textareaClassName = `${fieldClassName} resize-none leading-6`

const secondaryButtonClassName =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--panel)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]'

const primaryButtonClassName =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]'

const statCardClassName =
  'rounded-[20px] border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-3'

const sectionCardClassName =
  'mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--panel-elevated)] p-4'

type WorkspaceInspectorProps = {
  node?: WorkspaceNode
  edge?: WorkspaceEdge
  edgeSourceTitle?: string
  edgeTargetTitle?: string
  selectedNodeCount: number
  selectedEdgeCount: number
  batchCategory: string
  batchTagsText: string
  batchEdgeLabel: string
  batchEdgeSharedLabel?: string
  batchEdgeHasMixedLabels: boolean
  batchEdgeLabeledCount: number
  batchEdgeLabelBreakdown: Array<{ label: string; count: number; isEmpty: boolean }>
  batchTypeCounts: Array<{ type: WorkspaceNode['type']; count: number }>
  batchSharedCategory?: string
  batchHasMixedCategories: boolean
  batchUniqueTags: string[]
  activeGroupLabel?: string
  activeGroupCollapsed?: boolean
  canUngroupSelection: boolean
  onChange: (updates: Partial<WorkspaceNode['data']>) => void
  onDelete: () => void
  onDeleteMany: () => void
  onDuplicateMany: () => void
  onDeleteEdge: () => void
  onDeleteManyEdges: () => void
  onEdgeLabelChange: (value: string) => void
  onClearEdgeLabel: () => void
  onBatchEdgeLabelChange: (value: string) => void
  onApplyBatchEdgeLabel: () => void
  onApplyBatchEdgeLabelValue: (value: string) => void
  onClearBatchEdgeLabels: () => void
  onBatchCategoryChange: (value: string) => void
  onBatchTagsChange: (value: string) => void
  onApplyBatchCategory: () => void
  onApplyBatchTags: () => void
  onClearBatchCategory: () => void
  onClearBatchTags: () => void
  onApplyLayout: (action: LayoutActionId) => void
  onCreateGroup: () => void
  onGroupLabelChange: (value: string) => void
  onUngroup: () => void
  onSelectGroup: () => void
  onToggleGroupCollapse: () => void
  onClearSelection: () => void
}

function renderTypeFields(
  node: WorkspaceNode,
  onChange: (updates: Partial<WorkspaceNode['data']>) => void,
) {
  if (node.type === 'note') {
    return (
      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">正文</div>
        <textarea
          value={node.data.body ?? ''}
          onChange={(event) => onChange({ body: event.target.value })}
          rows={5}
          className={textareaClassName}
        />
      </label>
    )
  }

  if (node.type === 'web') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">URL</div>
          <input
            value={node.data.url ?? ''}
            onChange={(event) => onChange({ url: event.target.value })}
            className={fieldClassName}
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">域名</div>
          <input
            value={node.data.domain ?? ''}
            onChange={(event) => onChange({ domain: event.target.value })}
            className={fieldClassName}
          />
        </label>
      </>
    )
  }

  if (node.type === 'image') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">图片地址</div>
          <input
            value={node.data.imageUrl ?? ''}
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            className={fieldClassName}
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">色彩</div>
          <input
            value={node.data.palette ?? ''}
            onChange={(event) => onChange({ palette: event.target.value })}
            className={fieldClassName}
          />
        </label>
      </>
    )
  }

  if (node.type === 'ai_insight') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">摘要</div>
          <textarea
            value={node.data.summary ?? ''}
            onChange={(event) => onChange({ summary: event.target.value })}
            rows={5}
            className={textareaClassName}
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">关键词</div>
          <textarea
            value={(node.data.keywords ?? []).join(', ')}
            onChange={(event) =>
              onChange({
                keywords: event.target.value
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            rows={3}
            className={textareaClassName}
          />
        </label>
        {node.data.question ? (
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--panel-soft)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
            追问：{node.data.question}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">分类</div>
        <input
          value={node.data.category ?? ''}
          onChange={(event) => onChange({ category: event.target.value })}
          className={fieldClassName}
        />
      </label>
      <label className="mb-6 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">标签</div>
        <textarea
          value={(node.data.tags ?? []).join(', ')}
          onChange={(event) =>
            onChange({
              tags: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className={textareaClassName}
        />
      </label>
    </>
  )
}

export function WorkspaceInspector({
  node,
  edge,
  edgeSourceTitle,
  edgeTargetTitle,
  selectedNodeCount,
  selectedEdgeCount,
  batchCategory,
  batchTagsText,
  batchEdgeLabel,
  batchEdgeSharedLabel,
  batchEdgeHasMixedLabels,
  batchEdgeLabeledCount,
  batchEdgeLabelBreakdown,
  batchTypeCounts,
  batchSharedCategory,
  batchHasMixedCategories,
  batchUniqueTags,
  activeGroupLabel,
  activeGroupCollapsed = false,
  canUngroupSelection,
  onChange,
  onDelete,
  onDeleteMany,
  onDuplicateMany,
  onDeleteEdge,
  onDeleteManyEdges,
  onEdgeLabelChange,
  onClearEdgeLabel,
  onBatchEdgeLabelChange,
  onApplyBatchEdgeLabel,
  onApplyBatchEdgeLabelValue,
  onClearBatchEdgeLabels,
  onBatchCategoryChange,
  onBatchTagsChange,
  onApplyBatchCategory,
  onApplyBatchTags,
  onClearBatchCategory,
  onClearBatchTags,
  onApplyLayout,
  onCreateGroup,
  onGroupLabelChange,
  onUngroup,
  onSelectGroup,
  onToggleGroupCollapse,
  onClearSelection,
}: WorkspaceInspectorProps) {
  const isNodeMultiSelect = selectedNodeCount > 1
  const isEdgeMultiSelect = selectedEdgeCount > 1 && selectedNodeCount === 0
  const isEdgeSingleSelect = selectedEdgeCount === 1 && selectedNodeCount === 0
  const edgeLabelInputRef = useRef<HTMLInputElement | null>(null)
  const batchEdgeLabelInputRef = useRef<HTMLInputElement | null>(null)
  const previousEdgeIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const nextEdgeId = isEdgeSingleSelect ? edge?.id : undefined
    const hasChanged = previousEdgeIdRef.current !== nextEdgeId
    previousEdgeIdRef.current = nextEdgeId

    if (!nextEdgeId || !hasChanged) return

    window.requestAnimationFrame(() => {
      edgeLabelInputRef.current?.focus()
      edgeLabelInputRef.current?.select()
    })
  }, [edge?.id, isEdgeSingleSelect])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent)]">
            {isNodeMultiSelect || isEdgeMultiSelect ? (
              <Layers3 className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">检查器</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {isNodeMultiSelect
                ? '批量处理选中的节点'
                : isEdgeSingleSelect || isEdgeMultiSelect
                  ? '查看选中的连接'
                  : '编辑选中的画布项'}
            </div>
          </div>
        </div>

        {selectedNodeCount > 0 || selectedEdgeCount > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isNodeMultiSelect ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {activeGroupLabel ? `已选中 ${activeGroupLabel}` : `已选中 ${selectedNodeCount} 个节点`}
          </div>

          {activeGroupLabel ? (
            <label className="mb-4 block">
              <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">分组名称</div>
              <input
                value={activeGroupLabel}
                onChange={(event) => onGroupLabelChange(event.target.value)}
                className={fieldClassName}
              />
            </label>
          ) : null}

          <div className="mb-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--panel-elevated)] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              批量元信息可以把笔记、图片和链接归到同一条线索里，无需逐个打开卡片。
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className={statCardClassName}>
              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">类型</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {batchTypeCounts.map(({ type, count }) => `${count} ${nodeTypeLabels[type]}`).join(' · ')}
              </div>
            </div>
            <div className={statCardClassName}>
              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">分类</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {batchHasMixedCategories ? '混合' : batchSharedCategory || '空'}
              </div>
            </div>
            <div className={statCardClassName}>
              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">标签</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">{batchUniqueTags.length}</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCreateGroup}
              className={secondaryButtonClassName}
            >
              <FolderInput className="h-4 w-4" />
              分组
            </button>
            <button
              type="button"
              onClick={activeGroupLabel ? onToggleGroupCollapse : onUngroup}
              disabled={!canUngroupSelection && !activeGroupLabel}
              className={`${secondaryButtonClassName} disabled:opacity-40`}
            >
              {activeGroupLabel ? (
                activeGroupCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              {activeGroupLabel ? (activeGroupCollapsed ? '展开' : '折叠') : '取消分组'}
            </button>
          </div>

          {activeGroupLabel ? (
            <button
              type="button"
              onClick={onUngroup}
              className={`mb-4 ${secondaryButtonClassName}`}
            >
              <FolderOpen className="h-4 w-4" />
              移除分组
            </button>
          ) : null}

          <div className={sectionCardClassName}>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">布局工具</div>
            <p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">
              对齐和分布会参考每个节点实际测量后的卡片尺寸。
            </p>
            <div className="grid grid-cols-4 gap-2">
              {layoutActions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onApplyLayout(id)}
                  title={label}
                  className="inline-flex h-10 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">批量分类</div>
            <input
              value={batchCategory}
              onChange={(event) => onBatchCategoryChange(event.target.value)}
              placeholder={batchHasMixedCategories ? '设置统一分类...' : '情绪板、研究、发布...'}
              className={fieldClassName}
            />
          </label>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={onApplyBatchCategory}
              className={`${primaryButtonClassName} flex-1`}
            >
              应用分类
            </button>
            <button
              type="button"
              onClick={onClearBatchCategory}
              className={secondaryButtonClassName}
            >
              清空分类
            </button>
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">批量标签</div>
            <textarea
              value={batchTagsText}
              onChange={(event) => onBatchTagsChange(event.target.value)}
              placeholder={
                batchUniqueTags.length > 0 ? `${batchUniqueTags.slice(0, 3).join(', ')}...` : '编辑感、克制、暖灰'
              }
              rows={4}
              className={textareaClassName}
            />
          </label>

          <button
            type="button"
            onClick={onApplyBatchTags}
            className={`mb-3 ${primaryButtonClassName}`}
          >
            合并标签
          </button>

          <button
            type="button"
            onClick={onClearBatchTags}
            className={`mb-3 ${secondaryButtonClassName}`}
          >
            清空标签
          </button>

          <button
            type="button"
            onClick={onDuplicateMany}
            className={`mb-3 ${secondaryButtonClassName}`}
          >
            <Copy className="h-4 w-4" />
            复制选中项
          </button>

          <button
            type="button"
            onClick={onDeleteMany}
            className={`mt-auto ${secondaryButtonClassName}`}
          >
            <Trash2 className="h-4 w-4" />
            删除选中项
          </button>
        </div>
      ) : isEdgeMultiSelect ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            已选中 {selectedEdgeCount} 条连接
          </div>

          <div className="mb-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--panel-elevated)] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              这些连接定义了笔记、图片和参考资料在画布中的关系。
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className={statCardClassName}>
              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">标签</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {batchEdgeHasMixedLabels ? '混合' : batchEdgeSharedLabel || '空'}
              </div>
            </div>
            <div className={statCardClassName}>
              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">已命名</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {batchEdgeLabeledCount} / {selectedEdgeCount}
              </div>
            </div>
          </div>

          <div className={sectionCardClassName}>
            <div className="mb-3 text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">关系分布</div>
            <div className="flex flex-wrap gap-2">
              {batchEdgeLabelBreakdown.map((entry) => (
                <button
                  key={entry.isEmpty ? 'empty' : entry.label}
                  type="button"
                  onClick={() => {
                    onBatchEdgeLabelChange(entry.label)
                    window.requestAnimationFrame(() => {
                      batchEdgeLabelInputRef.current?.focus()
                      batchEdgeLabelInputRef.current?.select()
                    })
                  }}
                  onDoubleClick={() => onApplyBatchEdgeLabelValue(entry.label)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    batchEdgeLabel === entry.label
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                      : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]'
                  }`}
                >
                  <span>{entry.isEmpty ? '空' : entry.label}</span>
                  <span className="rounded-full bg-[var(--panel-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">
                    {entry.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">批量关系</div>
            <input
              ref={batchEdgeLabelInputRef}
              value={batchEdgeLabel}
              onChange={(event) => onBatchEdgeLabelChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                onApplyBatchEdgeLabel()
              }}
              placeholder={batchEdgeHasMixedLabels ? '设置统一关系...' : '支持、依赖...'}
              className={fieldClassName}
            />
          </label>

          <div className="mb-4 flex flex-wrap gap-2">
            {relationshipPresets.map((preset, index) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onBatchEdgeLabelChange(preset)
                  window.requestAnimationFrame(() => {
                    batchEdgeLabelInputRef.current?.focus()
                    batchEdgeLabelInputRef.current?.select()
                  })
                }}
                onDoubleClick={() => onApplyBatchEdgeLabelValue(preset)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  batchEdgeLabel === preset
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]'
                }`}
              >
                {index + 1}. {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onApplyBatchEdgeLabel}
            className={`mb-3 ${primaryButtonClassName}`}
          >
            应用关系
          </button>

          <button
            type="button"
            onClick={onClearBatchEdgeLabels}
            className={`mb-3 ${secondaryButtonClassName}`}
          >
            清空标签
          </button>

          <button
            type="button"
            onClick={onDeleteManyEdges}
            className={`mt-auto ${secondaryButtonClassName}`}
          >
            <Trash2 className="h-4 w-4" />
            删除连接
          </button>
        </div>
      ) : isEdgeSingleSelect && edge ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            连接
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">关系标签</div>
            <input
              ref={edgeLabelInputRef}
              value={typeof edge.label === 'string' ? edge.label : ''}
              onChange={(event) => onEdgeLabelChange(event.target.value)}
              placeholder="支持、对比、来源于..."
              className={fieldClassName}
            />
          </label>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={onClearEdgeLabel}
              className={secondaryButtonClassName}
            >
              清空标签
            </button>
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">快捷关系</div>
            <div className="flex flex-wrap gap-2">
              {relationshipPresets.map((preset, index) => {
                const isActive = edge.label === preset

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onEdgeLabelChange(preset)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                        : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]'
                    }`}
                  >
                    {index + 1}. {preset}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-3 rounded-[24px] border border-[var(--border)] bg-[var(--panel-elevated)] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <span>来源</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm text-[var(--text-primary)]">{edgeSourceTitle ?? edge.source}</div>
          </div>

          <div className="mb-6 rounded-[24px] border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <span>目标</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm text-[var(--text-primary)]">{edgeTargetTitle ?? edge.target}</div>
          </div>

          <button
            type="button"
            onClick={onDeleteEdge}
            className={`mt-auto ${secondaryButtonClassName}`}
          >
            <Trash2 className="h-4 w-4" />
            删除连接
          </button>
        </div>
      ) : node ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {nodeTypeLabels[node.type]}
          </div>

          {node.data.groupLabel ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSelectGroup}
                className={secondaryButtonClassName}
              >
                <FolderInput className="h-4 w-4" />
                {node.data.groupLabel}
              </button>
              <button
                type="button"
                onClick={onUngroup}
                className={secondaryButtonClassName}
              >
                <FolderOpen className="h-4 w-4" />
                取消分组
              </button>
              <button
                type="button"
                onClick={onToggleGroupCollapse}
                className={secondaryButtonClassName}
              >
                {node.data.groupCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                {node.data.groupCollapsed ? '展开' : '折叠'}
              </button>
            </div>
          ) : null}

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">标题</div>
            <input
              value={node.data.title}
              onChange={(event) => onChange({ title: event.target.value })}
              className={fieldClassName}
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">描述</div>
            <textarea
              value={node.data.description ?? ''}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={4}
              className={textareaClassName}
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">元信息标签</div>
            <input
              value={node.data.meta ?? ''}
              onChange={(event) => onChange({ meta: event.target.value })}
              className={fieldClassName}
            />
          </label>

          {renderTypeFields(node, onChange)}

          <button
            type="button"
            onClick={onDelete}
            className={`mt-auto ${secondaryButtonClassName}`}
          >
            <Trash2 className="h-4 w-4" />
            删除节点
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--panel-elevated)] p-6 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            选择一个或多个节点/连接，即可编辑详情或批量移除。
          </p>
        </div>
      )}
    </div>
  )
}
