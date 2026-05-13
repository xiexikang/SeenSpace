import { ArrowLeft, Check, Copy, Layers3, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { WorkspaceInspector } from '../../components/workspace/workspace-inspector'
import { CanvasStage } from '../../features/canvas/components/canvas-stage'
import { getProjectById, updateProjectCanvas } from '../../features/project/services/project-service'
import type { TagMetaNodeData, WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../types/workspace'

const emptySnapshot: WorkspaceSnapshot = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

const duplicateOffset = { x: 44, y: 44 }
const historyLimit = 80
const fallbackNodeSize = { width: 260, height: 180 }

type LayoutActionId =
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'align-top'
  | 'align-center-y'
  | 'align-bottom'
  | 'distribute-x'
  | 'distribute-y'

function parseTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function sanitizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({ ...node, selected: false })),
    edges: snapshot.edges.map((edge) => ({ ...edge, selected: false })),
  }
}

function snapshotsEqual(left: WorkspaceSnapshot, right: WorkspaceSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function updateSelectedNodesLayout(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  action: LayoutActionId,
) {
  const selectedSet = new Set(selectedNodeIds)
  const selectedNodes = nodes.filter((node) => selectedSet.has(node.id))

  if (selectedNodes.length < 2) {
    return nodes
  }

  const updates = new Map<string, WorkspaceNode['position']>()
  const bounds = selectedNodes.map((node) => {
    const width = node.measured?.width ?? node.width ?? fallbackNodeSize.width
    const height = node.measured?.height ?? node.height ?? fallbackNodeSize.height

    return {
      node,
      left: node.position.x,
      right: node.position.x + width,
      top: node.position.y,
      bottom: node.position.y + height,
      centerX: node.position.x + width / 2,
      centerY: node.position.y + height / 2,
      width,
      height,
    }
  })

  const left = Math.min(...bounds.map((bound) => bound.left))
  const right = Math.max(...bounds.map((bound) => bound.right))
  const centerX =
    (Math.min(...bounds.map((bound) => bound.left)) + Math.max(...bounds.map((bound) => bound.right))) / 2
  const top = Math.min(...bounds.map((bound) => bound.top))
  const bottom = Math.max(...bounds.map((bound) => bound.bottom))
  const centerY =
    (Math.min(...bounds.map((bound) => bound.top)) + Math.max(...bounds.map((bound) => bound.bottom))) / 2

  if (action === 'align-left') {
    selectedNodes.forEach((node) => updates.set(node.id, { ...node.position, x: left }))
  }

  if (action === 'align-center-x') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, x: centerX - bound.width / 2 }),
    )
  }

  if (action === 'align-right') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, x: right - bound.width }),
    )
  }

  if (action === 'align-top') {
    selectedNodes.forEach((node) => updates.set(node.id, { ...node.position, y: top }))
  }

  if (action === 'align-center-y') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, y: centerY - bound.height / 2 }),
    )
  }

  if (action === 'align-bottom') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, y: bottom - bound.height }),
    )
  }

  if (action === 'distribute-x') {
    const sorted = [...bounds].sort((a, b) => a.left - b.left)
    const totalWidth = sorted.reduce((sum, bound) => sum + bound.width, 0)
    const span = right - left
    const gap = sorted.length > 1 ? Math.max((span - totalWidth) / (sorted.length - 1), 0) : 0
    let cursor = left
    sorted.forEach((bound) => {
      updates.set(bound.node.id, { ...bound.node.position, x: cursor })
      cursor += bound.width + gap
    })
  }

  if (action === 'distribute-y') {
    const sorted = [...bounds].sort((a, b) => a.top - b.top)
    const totalHeight = sorted.reduce((sum, bound) => sum + bound.height, 0)
    const span = bottom - top
    const gap = sorted.length > 1 ? Math.max((span - totalHeight) / (sorted.length - 1), 0) : 0
    let cursor = top
    sorted.forEach((bound) => {
      updates.set(bound.node.id, { ...bound.node.position, y: cursor })
      cursor += bound.height + gap
    })
  }

  return nodes.map((node) => {
    const nextPosition = updates.get(node.id)
    return nextPosition ? { ...node, position: nextPosition } : node
  })
}

function duplicateSelectedNodes(nodes: WorkspaceNode[], selectedNodeIds: string[]) {
  const selectedSet = new Set(selectedNodeIds)
  const selectedNodes = nodes.filter((node) => selectedSet.has(node.id))

  if (selectedNodes.length === 0) {
    return { nodes, duplicatedIds: [] as string[] }
  }

  const duplicates = selectedNodes.map((node) => ({
    ...node,
    id: crypto.randomUUID(),
    position: {
      x: node.position.x + duplicateOffset.x,
      y: node.position.y + duplicateOffset.y,
    },
    data: {
      ...node.data,
      title: node.data.title.endsWith(' Copy') ? node.data.title : `${node.data.title} Copy`,
    },
    selected: false,
  }))

  return {
    nodes: [...nodes, ...duplicates],
    duplicatedIds: duplicates.map((node) => node.id),
  }
}

function nudgeSelectedNodes(nodes: WorkspaceNode[], selectedNodeIds: string[], xDelta: number, yDelta: number) {
  if (selectedNodeIds.length === 0) {
    return nodes
  }

  const selectedSet = new Set(selectedNodeIds)
  return nodes.map((node) =>
    selectedSet.has(node.id)
      ? {
          ...node,
          position: {
            x: node.position.x + xDelta,
            y: node.position.y + yDelta,
          },
        }
      : node,
  )
}

export function WorkspacePage() {
  const { projectId } = useParams()
  const [projectName, setProjectName] = useState('Untitled Project')
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [batchCategory, setBatchCategory] = useState('')
  const [batchTagsText, setBatchTagsText] = useState('')
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef<WorkspaceSnapshot[]>([emptySnapshot])

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return
      const project = await getProjectById(projectId)
      if (project) {
        const initialSnapshot = sanitizeSnapshot(project.canvas)
        setProjectName(project.name)
        setSnapshot(initialSnapshot)
        historyRef.current = [initialSnapshot]
        setHistoryIndex(0)
      }
    }

    void loadProject()
  }, [projectId])

  const selectedNodes = useMemo(
    () => snapshot.nodes.filter((node) => selectedNodeIds.includes(node.id)),
    [selectedNodeIds, snapshot.nodes],
  )

  const selectedEdges = useMemo(
    () => snapshot.edges.filter((edge) => selectedEdgeIds.includes(edge.id)),
    [selectedEdgeIds, snapshot.edges],
  )

  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined
  const sourceNode = selectedEdge
    ? snapshot.nodes.find((node) => node.id === selectedEdge.source)
    : undefined
  const targetNode = selectedEdge
    ? snapshot.nodes.find((node) => node.id === selectedEdge.target)
    : undefined
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyRef.current.length - 1

  useEffect(() => {
    if (selectedNodeIds.length > 1) {
      setBatchCategory('')
      setBatchTagsText('')
    }
  }, [selectedNodeIds.length])

  async function persistSnapshot(nextSnapshot: WorkspaceSnapshot, options?: { recordHistory?: boolean }) {
    const cleanSnapshot = sanitizeSnapshot(nextSnapshot)
    const shouldRecordHistory = options?.recordHistory ?? true

    if (shouldRecordHistory) {
      const currentSnapshot = historyRef.current[historyIndex] ?? snapshot
      if (!snapshotsEqual(currentSnapshot, cleanSnapshot)) {
        const nextHistory = [...historyRef.current.slice(0, historyIndex + 1), cleanSnapshot].slice(-historyLimit)
        historyRef.current = nextHistory
        setHistoryIndex(nextHistory.length - 1)
      }
    }

    setSnapshot(cleanSnapshot)
    setSaveState('saving')

    if (projectId) {
      await updateProjectCanvas(projectId, cleanSnapshot)
    }

    setSaveState('saved')
  }

  function clearSelection() {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setSnapshot((current) => sanitizeSnapshot(current))
  }

  function applySnapshotWithoutSelection(nextSnapshot: WorkspaceSnapshot, options?: { recordHistory?: boolean }) {
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    void persistSnapshot(nextSnapshot, options)
  }

  function handleUndo() {
    if (!canUndo) return
    const nextIndex = historyIndex - 1
    const previousSnapshot = historyRef.current[nextIndex]
    if (!previousSnapshot) return
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setHistoryIndex(nextIndex)
    void persistSnapshot(previousSnapshot, { recordHistory: false })
  }

  function handleRedo() {
    if (!canRedo) return
    const nextIndex = historyIndex + 1
    const nextSnapshot = historyRef.current[nextIndex]
    if (!nextSnapshot) return
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setHistoryIndex(nextIndex)
    void persistSnapshot(nextSnapshot, { recordHistory: false })
  }

  function deleteNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return

    const idSet = new Set(nodeIds)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.filter((node) => !idSet.has(node.id)),
      edges: snapshot.edges.filter(
        (edge) => !idSet.has(edge.source) && !idSet.has(edge.target),
      ),
    }

    applySnapshotWithoutSelection(nextSnapshot)
  }

  function deleteEdges(edgeIds: string[]) {
    if (edgeIds.length === 0) return

    const idSet = new Set(edgeIds)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: snapshot.edges.filter((edge) => !idSet.has(edge.id)),
    }

    applySnapshotWithoutSelection(nextSnapshot)
  }

  function handleDuplicateMany() {
    if (selectedNodeIds.length === 0) return

    const result = duplicateSelectedNodes(snapshot.nodes, selectedNodeIds)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: result.nodes,
    }

    setSelectedNodeIds(result.duplicatedIds)
    setSelectedEdgeIds([])
    void persistSnapshot(nextSnapshot)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isTyping =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable === true

      if (isTyping) return

      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        if (key === 'z' && event.shiftKey) {
          event.preventDefault()
          handleRedo()
          return
        }

        if (key === 'y') {
          event.preventDefault()
          handleRedo()
          return
        }

        if (key === 'z') {
          event.preventDefault()
          handleUndo()
          return
        }

        if (key === 'd' && selectedNodeIds.length > 0) {
          event.preventDefault()
          handleDuplicateMany()
          return
        }
      }

      if (event.key === 'Escape' && (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0)) {
        event.preventDefault()
        clearSelection()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          event.preventDefault()
          deleteNodes(selectedNodeIds)
          return
        }

        if (selectedEdgeIds.length > 0) {
          event.preventDefault()
          deleteEdges(selectedEdgeIds)
          return
        }
      }

      if (selectedNodeIds.length > 0) {
        const step = event.shiftKey ? 24 : 8
        const movementByKey: Record<string, { x: number; y: number }> = {
          ArrowLeft: { x: -step, y: 0 },
          ArrowRight: { x: step, y: 0 },
          ArrowUp: { x: 0, y: -step },
          ArrowDown: { x: 0, y: step },
        }

        const movement = movementByKey[event.key]
        if (movement) {
          event.preventDefault()
          const nextSnapshot: WorkspaceSnapshot = {
            ...snapshot,
            nodes: nudgeSelectedNodes(snapshot.nodes, selectedNodeIds, movement.x, movement.y),
          }
          void persistSnapshot(nextSnapshot)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canRedo, canUndo, historyIndex, selectedNodeIds, selectedEdgeIds, snapshot])

  function handleSnapshotChange(nextSnapshot: WorkspaceSnapshot) {
    setSnapshot(nextSnapshot)
    void persistSnapshot(nextSnapshot)
  }

  function handleNodeChange(updates: Partial<WorkspaceNode['data']>) {
    if (!selectedNode) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node,
      ),
    }

    void persistSnapshot(nextSnapshot)
  }

  function handleEdgeLabelChange(value: string) {
    if (!selectedEdge) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: snapshot.edges.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              label: value,
            }
          : edge,
      ),
    }

    void persistSnapshot(nextSnapshot)
  }

  function handleApplyLayout(action: LayoutActionId) {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: updateSelectedNodesLayout(snapshot.nodes, selectedNodeIds, action),
    }

    void persistSnapshot(nextSnapshot)
  }

  function applyBatchMeta() {
    if (selectedNodeIds.length < 2) return

    const idSet = new Set(selectedNodeIds)
    const tags = parseTags(batchTagsText)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.map((node) => {
        if (!idSet.has(node.id)) return node

        const currentTags = 'tags' in node.data ? node.data.tags ?? [] : []
        const mergedTags = Array.from(new Set([...currentTags, ...tags]))

        return {
          ...node,
          data: {
            ...node.data,
            ...(batchCategory ? { meta: batchCategory } : {}),
            ...(('category' in node.data || node.type === 'tag_meta')
              ? ({ category: batchCategory || (node.data as TagMetaNodeData).category } as Partial<
                  TagMetaNodeData
                >)
              : {}),
            ...(tags.length > 0 ? { tags: mergedTags } : {}),
          },
        }
      }),
    }

    void persistSnapshot(nextSnapshot)
  }

  function handleDeleteNode() {
    if (!selectedNode) return
    deleteNodes([selectedNode.id])
  }

  function handleDeleteMany() {
    deleteNodes(selectedNodeIds)
  }

  function handleDeleteEdge() {
    if (!selectedEdge) return
    deleteEdges([selectedEdge.id])
  }

  function handleDeleteManyEdges() {
    deleteEdges(selectedEdgeIds)
  }

  const totalSelectionCount = selectedNodeIds.length + selectedEdgeIds.length
  const selectionSummary =
    selectedNodeIds.length > 0
      ? `${selectedNodeIds.length} node${selectedNodeIds.length > 1 ? 's' : ''} selected`
      : selectedEdgeIds.length > 0
        ? selectedEdges.length === 1
          ? `${selectedEdges[0].label || 'connection'} selected`
          : `${selectedEdgeIds.length} connection${selectedEdgeIds.length > 1 ? 's' : ''} selected`
        : 'Local-first canvas workspace'

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <LibrarySidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopToolbar title="SeenSpace (见间)" rightAction="workspace" />

        <section className="flex flex-1 flex-col p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">{projectName}</h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    {saveState === 'saving' ? 'Saving...' : 'Saved locally'}
                  </span>
                  <span>{snapshot.nodes.length} nodes</span>
                  <span>{snapshot.edges.length} connections</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] disabled:opacity-40"
              >
                <Redo2 className="h-4 w-4" />
              </button>

              {totalSelectionCount > 1 ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
                    <Layers3 className="h-3.5 w-3.5" />
                    {selectionSummary}
                  </div>
                  {selectedNodeIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleDuplicateMany}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={selectedNodeIds.length > 0 ? handleDeleteMany : handleDeleteManyEdges}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </button>
                </>
              ) : totalSelectionCount === 1 ? (
                <>
                  <div className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
                    {selectionSummary}
                  </div>
                  {selectedNodeIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleDuplicateMany}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </>
              ) : (
                <div className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
                  {selectionSummary}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1">
              <CanvasStage
                snapshot={snapshot}
                onSnapshotChange={handleSnapshotChange}
                onSelectionChange={({ nodeIds, edgeIds }) => {
                  setSelectedNodeIds(nodeIds)
                  setSelectedEdgeIds(edgeIds)
                }}
              />
            </div>
            <WorkspaceInspector
              node={selectedNode}
              edge={selectedEdge as WorkspaceEdge | undefined}
              edgeSourceTitle={sourceNode?.data.title}
              edgeTargetTitle={targetNode?.data.title}
              selectedNodeCount={selectedNodeIds.length}
              selectedEdgeCount={selectedEdgeIds.length}
              batchCategory={batchCategory}
              batchTagsText={batchTagsText}
              onChange={handleNodeChange}
              onDelete={handleDeleteNode}
              onDeleteMany={handleDeleteMany}
              onDuplicateMany={handleDuplicateMany}
              onDeleteEdge={handleDeleteEdge}
              onDeleteManyEdges={handleDeleteManyEdges}
              onEdgeLabelChange={handleEdgeLabelChange}
              onBatchCategoryChange={setBatchCategory}
              onBatchTagsChange={setBatchTagsText}
              onApplyBatchMeta={applyBatchMeta}
              onApplyLayout={handleApplyLayout}
              onClearSelection={clearSelection}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
