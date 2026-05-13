import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
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
import type { WorkspaceEdge, WorkspaceNode } from '../../types/workspace'

const relationshipPresets = [
  'supports',
  'references',
  'contrasts with',
  'derived from',
  'depends on',
  'clusters with',
]

const layoutActions = [
  { id: 'align-left', label: 'Align Left', icon: AlignStartVertical },
  { id: 'align-center-x', label: 'Center X', icon: AlignCenterVertical },
  { id: 'align-right', label: 'Align Right', icon: AlignEndVertical },
  { id: 'align-top', label: 'Align Top', icon: AlignStartHorizontal },
  { id: 'align-center-y', label: 'Center Y', icon: AlignCenterHorizontal },
  { id: 'align-bottom', label: 'Align Bottom', icon: AlignEndHorizontal },
  { id: 'distribute-x', label: 'Distribute X', icon: BetweenHorizonalStart },
  { id: 'distribute-y', label: 'Distribute Y', icon: BetweenVerticalStart },
] as const

type LayoutActionId = (typeof layoutActions)[number]['id']

type WorkspaceInspectorProps = {
  node?: WorkspaceNode
  edge?: WorkspaceEdge
  edgeSourceTitle?: string
  edgeTargetTitle?: string
  selectedNodeCount: number
  selectedEdgeCount: number
  batchCategory: string
  batchTagsText: string
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
  onBatchCategoryChange: (value: string) => void
  onBatchTagsChange: (value: string) => void
  onApplyBatchMeta: () => void
  onApplyLayout: (action: LayoutActionId) => void
  onCreateGroup: () => void
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
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Body</div>
        <textarea
          value={node.data.body ?? ''}
          onChange={(event) => onChange({ body: event.target.value })}
          rows={5}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
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
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Domain</div>
          <input
            value={node.data.domain ?? ''}
            onChange={(event) => onChange({ domain: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
      </>
    )
  }

  if (node.type === 'image') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Image URL</div>
          <input
            value={node.data.imageUrl ?? ''}
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Palette</div>
          <input
            value={node.data.palette ?? ''}
            onChange={(event) => onChange({ palette: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
      </>
    )
  }

  return (
    <>
      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Category</div>
        <input
          value={node.data.category ?? ''}
          onChange={(event) => onChange({ category: event.target.value })}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
        />
      </label>
      <label className="mb-6 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Tags</div>
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
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
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
  onBatchCategoryChange,
  onBatchTagsChange,
  onApplyBatchMeta,
  onApplyLayout,
  onCreateGroup,
  onUngroup,
  onSelectGroup,
  onToggleGroupCollapse,
  onClearSelection,
}: WorkspaceInspectorProps) {
  const isNodeMultiSelect = selectedNodeCount > 1
  const isEdgeMultiSelect = selectedEdgeCount > 1 && selectedNodeCount === 0
  const isEdgeSingleSelect = selectedEdgeCount === 1 && selectedNodeCount === 0

  return (
    <aside className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--panel-elevated)] text-[var(--text-secondary)]">
            {isNodeMultiSelect || isEdgeMultiSelect ? (
              <Layers3 className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Inspector</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {isNodeMultiSelect
                ? 'Batch actions for selected nodes'
                : isEdgeSingleSelect || isEdgeMultiSelect
                  ? 'Inspect selected connections'
                  : 'Edit the selected canvas item'}
            </div>
          </div>
        </div>

        {selectedNodeCount > 0 || selectedEdgeCount > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isNodeMultiSelect ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {activeGroupLabel ? `${activeGroupLabel} selected` : `${selectedNodeCount} nodes selected`}
          </div>

          <div className="mb-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Batch metadata helps group notes, images, and links into the same lane without opening each card.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCreateGroup}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
            >
              <FolderInput className="h-4 w-4" />
              Group
            </button>
            <button
              type="button"
              onClick={activeGroupLabel ? onToggleGroupCollapse : onUngroup}
              disabled={!canUngroupSelection && !activeGroupLabel}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)] disabled:opacity-40"
            >
              {activeGroupLabel ? (
                activeGroupCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              {activeGroupLabel ? (activeGroupCollapsed ? 'Expand' : 'Collapse') : 'Ungroup'}
            </button>
          </div>

          {activeGroupLabel ? (
            <button
              type="button"
              onClick={onUngroup}
              className="mb-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
            >
              <FolderOpen className="h-4 w-4" />
              Remove Group
            </button>
          ) : null}

          <div className="mb-4 rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="mb-3 text-xs font-medium text-[var(--text-secondary)]">Layout Tools</div>
            <p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">
              Alignment and distribution now respect each node's measured card size.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {layoutActions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onApplyLayout(id)}
                  title={label}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Batch Category</div>
            <input
              value={batchCategory}
              onChange={(event) => onBatchCategoryChange(event.target.value)}
              placeholder="Moodboard, Research, Launch..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Batch Tags</div>
            <textarea
              value={batchTagsText}
              onChange={(event) => onBatchTagsChange(event.target.value)}
              placeholder="editorial, restraint, warm gray"
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <button
            type="button"
            onClick={onApplyBatchMeta}
            className="mb-3 inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--text-primary)] px-4 text-sm font-medium text-[var(--background)]"
          >
            Apply Metadata
          </button>

          <button
            type="button"
            onClick={onDuplicateMany}
            className="mb-3 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Copy className="h-4 w-4" />
            Duplicate Selected
          </button>

          <button
            type="button"
            onClick={onDeleteMany}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>
        </div>
      ) : isEdgeMultiSelect ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {selectedEdgeCount} connections selected
          </div>

          <div className="mb-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              These links define how notes, images, and references talk to each other across the board.
            </p>
          </div>

          <button
            type="button"
            onClick={onDeleteManyEdges}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Connections
          </button>
        </div>
      ) : isEdgeSingleSelect && edge ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            connection
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Relationship Label</div>
            <input
              value={typeof edge.label === 'string' ? edge.label : ''}
              onChange={(event) => onEdgeLabelChange(event.target.value)}
              placeholder="supports, contradicts, derives from..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Quick Relationships</div>
            <div className="flex flex-wrap gap-2">
              {relationshipPresets.map((preset) => {
                const isActive = edge.label === preset

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onEdgeLabelChange(preset)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-[var(--text-primary)] bg-[var(--panel-elevated)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]'
                    }`}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4 rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Source
            </div>
            <div className="text-sm text-[var(--text-primary)]">{edgeSourceTitle ?? edge.source}</div>
          </div>

          <div className="mb-6 rounded-[24px] border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Target
            </div>
            <div className="text-sm text-[var(--text-primary)]">{edgeTargetTitle ?? edge.target}</div>
          </div>

          <button
            type="button"
            onClick={onDeleteEdge}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Connection
          </button>
        </div>
      ) : node ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {node.type}
          </div>

          {node.data.groupLabel ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSelectGroup}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
              >
                <FolderInput className="h-4 w-4" />
                {node.data.groupLabel}
              </button>
              <button
                type="button"
                onClick={onUngroup}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
              >
                <FolderOpen className="h-4 w-4" />
                Ungroup
              </button>
              <button
                type="button"
                onClick={onToggleGroupCollapse}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
              >
                {node.data.groupCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                {node.data.groupCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          ) : null}

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Title</div>
            <input
              value={node.data.title}
              onChange={(event) => onChange({ title: event.target.value })}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Description</div>
            <textarea
              value={node.data.description ?? ''}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Meta Label</div>
            <input
              value={node.data.meta ?? ''}
              onChange={(event) => onChange({ meta: event.target.value })}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            />
          </label>

          {renderTypeFields(node, onChange)}

          <button
            type="button"
            onClick={onDelete}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Node
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Select one or more nodes or connections to edit details or remove them in a batch.
          </p>
        </div>
      )}
    </aside>
  )
}
