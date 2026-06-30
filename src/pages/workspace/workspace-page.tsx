import { ArrowLeft, Check, Copy, FolderInput, FolderOpen, Layers3, Maximize2, Minimize2, Redo2, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LibrarySidebar } from '../../components/shared/library-sidebar'
import { TopToolbar } from '../../components/shared/top-toolbar'
import { WorkspaceInspector } from '../../components/workspace/workspace-inspector'
import { AnalysisSidebar } from '../../features/ai/components/analysis-sidebar'
import type { AnalysisResult } from '../../features/ai/services/analysis-service'
import { CanvasStage } from '../../features/canvas/components/canvas-stage'
import { getProjectById, updateProjectCanvas } from '../../features/project/services/project-service'
import {
  deleteNodesFromSnapshot,
  duplicateSelectedNodes,
  renameGroup,
  toggleGroupCollapse,
  ungroupSelectedNodes,
} from '../../features/workspace/services/group-operations'
import {
  getRedoHistoryState,
  getUndoHistoryState,
  pushHistoryEntry,
  snapshotsEqual,
} from '../../features/workspace/services/workspace-history'
import { emptySnapshot, sanitizeSnapshot } from '../../features/workspace/services/workspace-snapshot'
import { resolveWorkspaceKeyboardAction } from '../../features/workspace/services/workspace-keyboard'
import { relationshipPresets } from '../../features/workspace/services/workspace-edges'
import { randomId } from '../../shared/utils/random-id'
import {
  deriveWorkspaceBatchEdgeState,
  deriveWorkspaceBatchMetadataState,
  deriveWorkspaceSelectionState,
} from '../../features/workspace/services/workspace-selection'
import {
  applyBatchCategory,
  applyBatchTags,
  applyEdgeLabel,
  clearEdgeLabels,
  clearBatchMetadata,
  type LayoutActionId,
  moveNodesByDelta,
  updateSelectedNodesLayout,
} from '../../features/workspace/services/workspace-transforms'
import type { WorkspaceEdge, WorkspaceNode, WorkspaceSnapshot } from '../../types/workspace'

const historyLimit = 80

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
    .map((label) => Number(label?.replace('Group ', '').replace('分组 ', '')))
    .filter((value) => Number.isFinite(value))
  const max = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0
  return `分组 ${max + 1}`
}

function getGroupNodeIds(nodes: WorkspaceNode[], groupId: string) {
  return nodes.filter((node) => node.data.groupId === groupId).map((node) => node.id)
}

function getInsightNodePosition(nodes: WorkspaceNode[], sourceNodeIds: string[]) {
  const sourceIdSet = new Set(sourceNodeIds)
  const sourceNodes = nodes.filter((node) => sourceIdSet.has(node.id))

  if (sourceNodes.length === 0) {
    return { x: 160 + nodes.length * 24, y: 160 }
  }

  return {
    x: Math.max(...sourceNodes.map((node) => node.position.x)) + 340,
    y: Math.min(...sourceNodes.map((node) => node.position.y)),
  }
}

export function WorkspacePage() {
  const { projectId } = useParams()
  const [projectName, setProjectName] = useState('未命名项目')
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [batchCategory, setBatchCategory] = useState('')
  const [batchTagsText, setBatchTagsText] = useState('')
  const [batchEdgeLabel, setBatchEdgeLabel] = useState('')
  const [historyIndex, setHistoryIndex] = useState(0)
  const [canvasStageVersion, setCanvasStageVersion] = useState(0)
  const historyRef = useRef<WorkspaceSnapshot[]>([emptySnapshot])
  const actionMessageTimeoutRef = useRef<number | null>(null)

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
  const batchMetadataState = deriveWorkspaceBatchMetadataState(selectedNodes)
  const batchEdgeState = deriveWorkspaceBatchEdgeState(
    snapshot.edges.filter((edge) => selectedEdgeIds.includes(edge.id)),
  )

  useEffect(() => {
    if (selectedNodeIds.length > 1) {
      setBatchCategory(batchMetadataState.sharedCategory ?? '')
      setBatchTagsText('')
    }
  }, [batchMetadataState.sharedCategory, selectedNodeIds.length])

  useEffect(() => {
    if (selectedEdgeIds.length > 1) {
      setBatchEdgeLabel(batchEdgeState.sharedLabel ?? '')
    }
  }, [batchEdgeState.sharedLabel, selectedEdgeIds.length])

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

  function showActionMessage(message: string) {
    setActionMessage(message)
    if (actionMessageTimeoutRef.current) {
      window.clearTimeout(actionMessageTimeoutRef.current)
    }
    actionMessageTimeoutRef.current = window.setTimeout(() => {
      setActionMessage(null)
      actionMessageTimeoutRef.current = null
    }, 2200)
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
    showActionMessage(`已删除 ${nodeIds.length} 个节点`)
  }

  function deleteEdges(edgeIds: string[]) {
    if (edgeIds.length === 0) return

    const idSet = new Set(edgeIds)
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: snapshot.edges.filter((edge) => !idSet.has(edge.id)),
    }

    applySnapshotWithoutSelection(nextSnapshot)
    showActionMessage(`已删除 ${edgeIds.length} 条连接`)
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
    showActionMessage(`已复制 ${result.duplicatedVisibleIds.length} 个节点`)
    window.requestAnimationFrame(() => {
      setSelectedNodeIds(result.duplicatedVisibleIds)
    })
  }

  function handleCreateGroup() {
    if (selectedNodeIds.length < 2) return
    const groupId = randomId()
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
    showActionMessage(`已创建 ${groupLabel}`)
  }

  function handleUngroup() {
    if (selectedNodeIds.length === 0) return
    const nextSnapshot = ungroupSelectedNodes(snapshot, selectedNodeIds)
    if (snapshotsEqual(snapshot, nextSnapshot)) return
    void persistSnapshot(nextSnapshot)
    showActionMessage('已取消分组')
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
    showActionMessage(result.collapsed ? '分组已折叠' : '分组已展开')
  }

  function handleGroupLabelChange(value: string) {
    if (!activeGroupId) return

    const nextSnapshot = renameGroup(snapshot, activeGroupId, value)
    if (snapshotsEqual(snapshot, nextSnapshot)) return
    void persistSnapshot(nextSnapshot)
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

      if (action.type === 'apply-edge-preset') {
        const preset = relationshipPresets[action.index]
        if (!preset) return

        if (selectedEdgeIds.length === 1 && selectedEdge) {
          handleEdgeLabelChange(preset)
          showActionMessage(`关系已设为 ${preset}`)
          return
        }

        if (selectedEdgeIds.length > 1) {
          const nextSnapshot: WorkspaceSnapshot = {
            ...snapshot,
            edges: applyEdgeLabel(snapshot.edges, selectedEdgeIds, preset),
          }

          void persistSnapshot(nextSnapshot)
          showActionMessage(`已将 ${formatRelationshipName(preset)} 应用到 ${selectedEdgeIds.length} 条连接`)
        }
        return
      }

      if (action.type === 'nudge-selected-nodes') {
        const nextSnapshot: WorkspaceSnapshot = {
          ...snapshot,
          nodes: moveNodesByDelta(snapshot.nodes, selectedNodeIds, action.delta.x, action.delta.y),
        }
        void persistSnapshot(nextSnapshot)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canRedo, canUndo, canUngroupSelection, historyIndex, selectedEdge, selectedEdgeIds, selectedNodeIds, snapshot, selectedNode, selectedNodes])

  function handleSnapshotChange(nextSnapshot: WorkspaceSnapshot) {
    void persistSnapshot(nextSnapshot)
  }

  function handleEdgeCreate(edge: WorkspaceEdge) {
    setSelectedNodeIds([])
    setSelectedEdgeIds([edge.id])
    showActionMessage(`已创建连接：${typeof edge.label === 'string' && edge.label.trim() ? edge.label : '未命名'}`)
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
      edges: applyEdgeLabel(snapshot.edges, [selectedEdge.id], value),
    }

    void persistSnapshot(nextSnapshot)
  }

  function formatRelationshipName(value: string) {
    return value.trim() || '空'
  }

  function handleApplyBatchEdgeLabel() {
    if (selectedEdgeIds.length < 2 || !batchEdgeLabel.trim()) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: applyEdgeLabel(snapshot.edges, selectedEdgeIds, batchEdgeLabel),
    }

    void persistSnapshot(nextSnapshot)
    showActionMessage(`已将 ${formatRelationshipName(batchEdgeLabel)} 应用到 ${selectedEdgeIds.length} 条连接`)
  }

  function handleApplyBatchEdgeLabelValue(value: string) {
    if (selectedEdgeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: applyEdgeLabel(snapshot.edges, selectedEdgeIds, value),
    }

    setBatchEdgeLabel(value)
    void persistSnapshot(nextSnapshot)
    showActionMessage(`已将 ${formatRelationshipName(value)} 应用到 ${selectedEdgeIds.length} 条连接`)
  }

  function handleClearEdgeLabel() {
    if (!selectedEdge) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: clearEdgeLabels(snapshot.edges, [selectedEdge.id]),
    }

    void persistSnapshot(nextSnapshot)
    showActionMessage('关系已清空')
  }

  function handleClearBatchEdgeLabels() {
    if (selectedEdgeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      edges: clearEdgeLabels(snapshot.edges, selectedEdgeIds),
    }

    setBatchEdgeLabel('')
    void persistSnapshot(nextSnapshot)
    showActionMessage('连接标签已清空')
  }

  function handleApplyLayout(action: LayoutActionId) {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: updateSelectedNodesLayout(snapshot.nodes, selectedNodeIds, action),
    }

    void persistSnapshot(nextSnapshot)
    showActionMessage('布局已更新')
  }

  function handleApplyBatchCategory() {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: applyBatchCategory(snapshot.nodes, selectedNodeIds, batchCategory),
    }

    void persistSnapshot(nextSnapshot)
    if (batchCategory.trim()) {
      showActionMessage(`分类已设为 ${batchCategory.trim()}`)
    }
  }

  function handleApplyBatchTags() {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: applyBatchTags(snapshot.nodes, selectedNodeIds, batchTagsText),
    }

    void persistSnapshot(nextSnapshot)
    const tagCount = batchTagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean).length
    if (tagCount > 0) {
      showActionMessage(`已合并 ${tagCount} 个标签`)
    }
  }

  function handleClearBatchCategory() {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: clearBatchMetadata(snapshot.nodes, selectedNodeIds, ['category']),
    }

    setBatchCategory('')
    void persistSnapshot(nextSnapshot)
    showActionMessage('分类已清空')
  }

  function handleClearBatchTags() {
    if (selectedNodeIds.length < 2) return

    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: clearBatchMetadata(snapshot.nodes, selectedNodeIds, ['tags']),
    }

    setBatchTagsText('')
    void persistSnapshot(nextSnapshot)
    showActionMessage('标签已清空')
  }

  function handleInsertInsight(result: AnalysisResult) {
    const nodeId = randomId()
    const position = getInsightNodePosition(snapshot.nodes, result.sourceNodeIds)
    const sourceNodeIdSet = new Set(result.sourceNodeIds)
    const sourceNodes = snapshot.nodes.filter((node) => sourceNodeIdSet.has(node.id))
    const insightNode: WorkspaceNode = {
      id: nodeId,
      type: 'ai_insight',
      position,
      data: {
        title: result.title,
        description: result.summary,
        meta: 'AI 洞察',
        summary: result.summary,
        keywords: result.keywords,
        sourceNodeIds: result.sourceNodeIds,
        scope: result.scope,
        question: result.question,
      },
    }
    const insightEdges: WorkspaceEdge[] = sourceNodes.slice(0, 4).map((node) => ({
      id: randomId(),
      source: node.id,
      target: nodeId,
      label: '提炼为',
      animated: false,
    }))
    const nextSnapshot: WorkspaceSnapshot = {
      ...snapshot,
      nodes: [...snapshot.nodes, insightNode],
      edges: [...snapshot.edges, ...insightEdges],
    }

    setSelectedNodeIds([nodeId])
    setSelectedEdgeIds([])
    void persistSnapshot(nextSnapshot)
    showActionMessage('AI 洞察已添加到画布')
  }

  useEffect(() => {
    return () => {
      if (actionMessageTimeoutRef.current) {
        window.clearTimeout(actionMessageTimeoutRef.current)
      }
    }
  }, [])

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
                    {saveState === 'saving' ? '保存中...' : '已保存到本地'}
                  </span>
                  {actionMessage ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                      {actionMessage}
                    </span>
                  ) : null}
                  <span>{snapshot.nodes.length} 个节点</span>
                  <span>{snapshot.edges.length} 条连接</span>
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
                        分组
                      </button>
                      <button
                        type="button"
                        onClick={handleUngroup}
                        disabled={!canUngroupSelection}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-40"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        取消分组
                      </button>
                      <button
                        type="button"
                        onClick={() => activeGroupId && handleToggleGroupCollapse(activeGroupId)}
                        disabled={!activeGroupId}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-40"
                      >
                        {activeGroupCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        {activeGroupCollapsed ? '展开' : '折叠'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDuplicateMany}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={selectedNodeIds.length > 0 ? handleDeleteMany : handleDeleteManyEdges}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除选中项
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
                        选择分组
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedNode.data.groupId && handleToggleGroupCollapse(selectedNode.data.groupId)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        {selectedNode.data.groupCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        {selectedNode.data.groupCollapsed ? '展开' : '折叠'}
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
                      复制
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    清除
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
                focusedEdgeIds={selectedEdgeIds}
                onEdgeCreate={handleEdgeCreate}
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
              batchEdgeLabel={batchEdgeLabel}
              batchEdgeSharedLabel={batchEdgeState.sharedLabel}
              batchEdgeHasMixedLabels={batchEdgeState.hasMixedLabels}
              batchEdgeLabeledCount={batchEdgeState.labeledCount}
              batchEdgeLabelBreakdown={batchEdgeState.labelBreakdown}
              batchTypeCounts={batchMetadataState.typeCounts}
              batchSharedCategory={batchMetadataState.sharedCategory}
              batchHasMixedCategories={batchMetadataState.hasMixedCategories}
              batchUniqueTags={batchMetadataState.uniqueTags}
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
              onClearEdgeLabel={handleClearEdgeLabel}
              onBatchEdgeLabelChange={setBatchEdgeLabel}
              onApplyBatchEdgeLabel={handleApplyBatchEdgeLabel}
              onApplyBatchEdgeLabelValue={handleApplyBatchEdgeLabelValue}
              onClearBatchEdgeLabels={handleClearBatchEdgeLabels}
              onBatchCategoryChange={setBatchCategory}
              onBatchTagsChange={setBatchTagsText}
              onApplyBatchCategory={handleApplyBatchCategory}
              onApplyBatchTags={handleApplyBatchTags}
              onClearBatchCategory={handleClearBatchCategory}
              onClearBatchTags={handleClearBatchTags}
              onApplyLayout={handleApplyLayout}
              onCreateGroup={handleCreateGroup}
              onGroupLabelChange={handleGroupLabelChange}
              onUngroup={handleUngroup}
              onSelectGroup={handleSelectGroup}
              onToggleGroupCollapse={() => activeGroupId && handleToggleGroupCollapse(activeGroupId)}
              onClearSelection={clearSelection}
            />
          </div>
          <AnalysisSidebar
            snapshot={snapshot}
            selectedNodeIds={selectedNodeIds}
            onInsertInsight={handleInsertInsight}
          />
        </section>
      </main>
    </div>
  )
}
