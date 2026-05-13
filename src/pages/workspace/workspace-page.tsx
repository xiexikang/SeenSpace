import { ArrowLeft, Check, Copy, FolderInput, FolderOpen, Layers3, Maximize2, Minimize2, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { WorkspaceInspector } from '../../components/workspace/workspace-inspector'
import { CanvasStage } from '../../features/canvas/components/canvas-stage'
import { getProjectById, updateProjectCanvas } from '../../features/project/services/project-service'
import {
  deleteNodesFromSnapshot,
  duplicateSelectedNodes,
  toggleGroupCollapse,
  ungroupSelectedNodes,
} from '../../features/workspace/services/group-operations'
import {
  getRedoHistoryState,
  getUndoHistoryState,
  pushHistoryEntry,
  snapshotsEqual,
} from '../../features/workspace/services/workspace-history'
import { resolveWorkspaceKeyboardAction } from '../../features/workspace/services/workspace-keyboard'
import { deriveWorkspaceSelectionState } from '../../features/workspace/services/workspace-selection'
import {
  applyBatchMetadata,
  type LayoutActionId,
  updateSelectedNodesLayout,
} from '../../features/workspace/services/workspace-transforms'
import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../types/workspace'

const emptySnapshot: WorkspaceSnapshot = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

const historyLimit = 80
function sanitizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      selected: false,
      hidden: false,
      data: {
        ...node.data,
        collapsedGroupSummary: undefined,
      },
    })),
    edges: snapshot.edges.map((edge) => ({ ...edge, selected: false })),
  }
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const leftSorted = [...left].sort()
  const rightSorted = [...right].sort()
  return leftSorted.every((value, index) => value === rightSorted[index])
}

function nextGroupLabel(nodes: WorkspaceNode[]) {
  const usedNumbers = nodes
    .map((node) => node.data.groupLabel)
    .filter(Boolean)
    .map((label) => Number(label?.replace('Group ', '')))
    .filter((value) => Number.isFinite(value))
  const max = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0
  return `Group ${max + 1}`
}

function getGroupNodeIds(nodes: WorkspaceNode[], groupId: string) {
  return nodes.filter((node) => node.data.groupId === groupId).map((node) => node.id)
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
  const [canvasStageVersion, setCanvasStageVersion] = useState(0)
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

  const {
    selectedNodes,
    selectedNode,
    selectedEdge,
    sourceNode,
    targetNode,
    activeGroupId,
    activeGroupLabel,
    activeGroupCollapsed,
    canUngroupSelection,
    totalSelectionCount,
    selectionSummary,
  } = deriveWorkspaceSelectionState(snapshot, selectedNodeIds, selectedEdgeIds)
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
    const currentSnapshot = historyRef.current[historyIndex] ?? snapshot

    if (snapshotsEqual(currentSnapshot, cleanSnapshot)) {
      setSnapshot((existing) => (snapshotsEqual(existing, cleanSnapshot) ? existing : cleanSnapshot))
      return
    }

    if (shouldRecordHistory) {
      if (!snapshotsEqual(currentSnapshot, cleanSnapshot)) {
        const nextHistoryState = pushHistoryEntry(historyRef.current, historyIndex, cleanSnapshot, historyLimit)
        historyRef.current = nextHistoryState.history
        setHistoryIndex(nextHistoryState.historyIndex)
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
    const previousHistoryState = getUndoHistoryState(historyRef.current, historyIndex)
    const previousSnapshot = previousHistoryState.snapshot
    if (!previousSnapshot) return
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setHistoryIndex(previousHistoryState.historyIndex)
    void persistSnapshot(previousSnapshot, { recordHistory: false })
  }

  function handleRedo() {
    if (!canRedo) return
    const nextHistoryState = getRedoHistoryState(historyRef.current, historyIndex)
    const nextSnapshot = nextHistoryState.snapshot
    if (!nextSnapshot) return
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setHistoryIndex(nextHistoryState.historyIndex)
    void persistSnapshot(nextSnapshot, { recordHistory: false })
  }

  function deleteNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return

    applySnapshotWithoutSelection(deleteNodesFromSnapshot(snapshot, nodeIds))
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

    setSelectedNodeIds([])
    setSelectedEdgeIds([])
    setCanvasStageVersion((current) => current + 1)
    void persistSnapshot(nextSnapshot)
    window.requestAnimationFrame(() => {
      setSelectedNodeIds(result.duplicatedVisibleIds)
    })
  }

  function handleCreateGroup() {
    if (selectedNodeIds.length < 2) return
    const groupId = crypto.randomUUID()
    const groupLabel = nextGroupLabel(snapshot.nodes)
    const leadId = selectedNodeIds[0]
    const idSet = new Set(selectedNodeIds)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: snapshot.nodes.map((node) =>
        idSet.has(node.id)
          ? {
              ...node,
              data: {
              ...node.data,
              groupId,
              groupLabel,
              groupLeadId: leadId,
              groupCollapsed: false,
            },
          }
          : node,
      ),
    }
    void persistSnapshot(nextSnapshot)
  }

  function handleUngroup() {
    if (selectedNodeIds.length === 0) return
    const nextSnapshot = ungroupSelectedNodes(snapshot, selectedNodeIds)
    if (snapshotsEqual(snapshot, nextSnapshot)) return
    void persistSnapshot(nextSnapshot)
  }

  function handleSelectGroup() {
    if (!selectedNode?.data.groupId) return
    const groupNodeIds = getGroupNodeIds(snapshot.nodes, selectedNode.data.groupId)
    setSelectedNodeIds(groupNodeIds)
    setSelectedEdgeIds([])
  }

  function handleSelectGroupById(groupId: string) {
    const groupNodeIds = getGroupNodeIds(snapshot.nodes, groupId)
    setSelectedNodeIds(groupNodeIds)
    setSelectedEdgeIds([])
  }

  function handleToggleGroupCollapse(groupId: string) {
    const result = toggleGroupCollapse(snapshot, groupId)
    if (result.memberIds.length === 0) return
    setSelectedNodeIds(result.memberIds)
    setSelectedEdgeIds([])
    void persistSnapshot(result.snapshot)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isTyping =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable === true

      const action = resolveWorkspaceKeyboardAction({
        isTyping,
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        selectedNodeCount: selectedNodeIds.length,
        selectedEdgeCount: selectedEdgeIds.length,
        canUndo,
        canRedo,
        canUngroupSelection,
      })

      if (!action) return

      event.preventDefault()

      if (action.type === 'redo') {
        handleRedo()
        return
      }

      if (action.type === 'undo') {
        handleUndo()
        return
      }

      if (action.type === 'duplicate-selection') {
        handleDuplicateMany()
        return
      }

      if (action.type === 'ungroup-selection') {
        handleUngroup()
        return
      }

      if (action.type === 'group-selection') {
        handleCreateGroup()
        return
      }

      if (action.type === 'clear-selection') {
        clearSelection()
        return
      }

      if (action.type === 'delete-selected-nodes') {
        deleteNodes(selectedNodeIds)
        return
      }

      if (action.type === 'delete-selected-edges') {
        deleteEdges(selectedEdgeIds)
        return
      }

      if (action.type === 'nudge-selected-nodes') {
        const nextSnapshot: WorkspaceSnapshot = {
          ...snapshot,
          nodes: nudgeSelectedNodes(snapshot.nodes, selectedNodeIds, action.delta.x, action.delta.y),
        }
        void persistSnapshot(nextSnapshot)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canRedo, canUndo, canUngroupSelection, historyIndex, selectedNodeIds, selectedEdgeIds, snapshot, selectedNode, selectedNodes])

  function handleSnapshotChange(nextSnapshot: WorkspaceSnapshot) {
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

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: applyBatchMetadata(snapshot.nodes, selectedNodeIds, batchCategory, batchTagsText),
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
                    <>
                      <button
                        type="button"
                        onClick={handleCreateGroup}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        <FolderInput className="h-3.5 w-3.5" />
                        Group
                      </button>
                      <button
                        type="button"
                        onClick={handleUngroup}
                        disabled={!canUngroupSelection}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-40"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Ungroup
                      </button>
                      <button
                        type="button"
                        onClick={() => activeGroupId && handleToggleGroupCollapse(activeGroupId)}
                        disabled={!activeGroupId}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-40"
                      >
                        {activeGroupCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        {activeGroupCollapsed ? 'Expand' : 'Collapse'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDuplicateMany}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </button>
                    </>
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
                  {selectedNode?.data.groupLabel ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectGroup}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        <FolderInput className="h-3.5 w-3.5" />
                        Select Group
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedNode.data.groupId && handleToggleGroupCollapse(selectedNode.data.groupId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        {selectedNode.data.groupCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        {selectedNode.data.groupCollapsed ? 'Expand' : 'Collapse'}
                      </button>
                    </>
                  ) : null}
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
                key={`${projectId ?? 'workspace'}-${canvasStageVersion}`}
                snapshot={snapshot}
                selectedNodeIds={selectedNodeIds}
                onSelectGroup={handleSelectGroupById}
                onToggleGroupCollapse={handleToggleGroupCollapse}
                onSnapshotChange={handleSnapshotChange}
                onSelectionChange={({ nodeIds, edgeIds }) => {
                  setSelectedNodeIds((current) => (sameIds(current, nodeIds) ? current : nodeIds))
                  setSelectedEdgeIds((current) => (sameIds(current, edgeIds) ? current : edgeIds))
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
              activeGroupLabel={activeGroupLabel}
              activeGroupCollapsed={activeGroupCollapsed}
              canUngroupSelection={canUngroupSelection}
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
              onCreateGroup={handleCreateGroup}
              onUngroup={handleUngroup}
              onSelectGroup={handleSelectGroup}
              onToggleGroupCollapse={() => activeGroupId && handleToggleGroupCollapse(activeGroupId)}
              onClearSelection={clearSelection}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
