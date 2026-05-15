import '@xyflow/react/dist/style.css'

import { Maximize2, Minimize2 } from 'lucide-react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  WorkspaceEdge,
  WorkspaceNode,
  WorkspaceNodeType,
  WorkspaceSnapshot,
} from '../../../types/workspace'
import { nodeTypes } from '../../nodes/components/node-renderer'
import { createWorkspaceNode } from '../../nodes/services/node-factory'
import {
  buildCanvasGroupOverlays,
  getCanvasGroupOverlayStyle,
} from '../services/canvas-group-overlays'
import { applyGroupDragMove, getDragGuides, type GuideLine } from '../services/canvas-drag'
import {
  buildCanvasStageState,
  shouldPersistEdgeChanges,
  shouldPersistNodeChanges,
} from '../services/canvas-stage-state'
import { createConnectionEdge } from '../../workspace/services/workspace-edges'
import {
  expandSelectedNodeIdsByGroup,
} from '../../workspace/services/group-operations'
import {
  applyClipboardPayloadToNode,
  createNodeFromClipboardPayload,
  getPasteConflictTarget,
  parseClipboardImport,
  type ClipboardImportPayload,
} from '../services/clipboard-import'
import { CanvasEmptyState } from './canvas-empty-state'
import { ZoomControls } from './zoom-controls'

type CanvasStageProps = {
  snapshot: WorkspaceSnapshot
  selectedNodeIds?: string[]
  focusedEdgeIds?: string[]
  onEdgeCreate?: (edge: WorkspaceEdge) => void
  onSelectGroup?: (groupId: string) => void
  onToggleGroupCollapse?: (groupId: string) => void
  onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void
  onSelectionChange?: (selection: { nodeIds: string[]; edgeIds: string[] }) => void
}

const addableNodeTypes: Array<{ type: WorkspaceNodeType; label: string }> = [
  { type: 'note', label: '添加笔记' },
  { type: 'image', label: '添加图片' },
  { type: 'web', label: '添加网页' },
  { type: 'tag_meta', label: '添加标签 / 元信息' },
]

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: 'var(--text-muted)',
  },
} as const

function isEditablePasteTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
}

function nodeShapeSignature(node: WorkspaceNode) {
  return JSON.stringify({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    hidden: node.hidden,
    selected: node.selected,
    width: node.width,
    height: node.height,
    measured: node.measured,
  })
}

function edgeShapeSignature(edge: WorkspaceEdge) {
  return JSON.stringify({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    hidden: edge.hidden,
    selected: edge.selected,
    animated: edge.animated,
  })
}

function nodeListsEqual(left: WorkspaceNode[], right: WorkspaceNode[]) {
  if (left.length !== right.length) return false
  return left.every((node, index) => nodeShapeSignature(node) === nodeShapeSignature(right[index]))
}

function edgeListsEqual(left: WorkspaceEdge[], right: WorkspaceEdge[]) {
  if (left.length !== right.length) return false
  return left.every((edge, index) => edgeShapeSignature(edge) === edgeShapeSignature(right[index]))
}

export function CanvasStage({
  snapshot,
  selectedNodeIds = [],
  focusedEdgeIds = [],
  onEdgeCreate,
  onSelectGroup,
  onToggleGroupCollapse,
  onSnapshotChange,
  onSelectionChange,
}: CanvasStageProps) {
  const initialStageState = buildCanvasStageState(snapshot, focusedEdgeIds.length === 1 ? snapshot.edges.find((edge) => edge.id === focusedEdgeIds[0]) : undefined)
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<WorkspaceNode>(initialStageState.nodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<WorkspaceEdge>(initialStageState.edges)
  const [zoomLabel, setZoomLabel] = useState(`${Math.round(snapshot.viewport.zoom * 100)}%`)
  const [viewport, setViewport] = useState(snapshot.viewport)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [isGridSnapEnabled, setIsGridSnapEnabled] = useState(true)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [pendingPaste, setPendingPaste] = useState<{
    payload: ClipboardImportPayload
    targetNodeId?: string
  } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<ReactFlowInstance<WorkspaceNode, WorkspaceEdge> | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const viewportRef = useRef(snapshot.viewport)
  const groupDragStateRef = useRef<{ groupId: string; nodeIds: string[]; pointerId: number } | null>(null)
  const focusedEdge = focusedEdgeIds.length === 1 ? snapshot.edges.find((edge) => edge.id === focusedEdgeIds[0]) : undefined

  useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = buildCanvasStageState(snapshot, focusedEdge)

    setNodes((currentNodes) => (nodeListsEqual(currentNodes, nextNodes) ? currentNodes : nextNodes))
    setEdges((currentEdges) => (edgeListsEqual(currentEdges, nextEdges) ? currentEdges : nextEdges))
    setZoomLabel(`${Math.round(snapshot.viewport.zoom * 100)}%`)
    setViewport(snapshot.viewport)
    viewportRef.current = snapshot.viewport
  }, [focusedEdge, setEdges, setNodes, snapshot])

  const groupOverlays = useMemo(() => buildCanvasGroupOverlays(nodes, selectedNodeIds), [nodes, selectedNodeIds])

  const emitSnapshot = useCallback(() => {
    if (!flowRef.current) return
    onSnapshotChange?.({
      nodes: flowRef.current.getNodes() as WorkspaceNode[],
      edges: flowRef.current.getEdges() as WorkspaceEdge[],
      viewport: flowRef.current.getViewport(),
    })
  }, [onSnapshotChange])

  const emitSnapshotWith = useCallback((nextNodes: WorkspaceNode[], nextEdges: WorkspaceEdge[]) => {
    onSnapshotChange?.({
      nodes: nextNodes,
      edges: nextEdges,
      viewport: flowRef.current?.getViewport() ?? viewportRef.current,
    })
  }, [onSnapshotChange])

  const scheduleSnapshotSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      emitSnapshot()
    }, 180)
  }, [emitSnapshot])

  const onNodesChange = useCallback((changes: NodeChange<WorkspaceNode>[]) => {
    onNodesChangeBase(changes)
    if (shouldPersistNodeChanges(changes)) {
      scheduleSnapshotSave()
    }
  }, [onNodesChangeBase, scheduleSnapshotSave])

  const onEdgesChange = useCallback((changes: EdgeChange<WorkspaceEdge>[]) => {
    onEdgesChangeBase(changes)
    if (shouldPersistEdgeChanges(changes)) {
      scheduleSnapshotSave()
    }
  }, [onEdgesChangeBase, scheduleSnapshotSave])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return

    const nextEdge = createConnectionEdge(
      {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      },
      nodes,
    )

    setEdges((current) => addEdge(nextEdge, current))
    onSelectionChange?.({ nodeIds: [], edgeIds: [nextEdge.id] })
    onEdgeCreate?.(nextEdge)
    scheduleSnapshotSave()
  }, [nodes, onEdgeCreate, onSelectionChange, scheduleSnapshotSave, setEdges])

  function addNode(type: WorkspaceNodeType) {
    setNodes((current) => [...current, createWorkspaceNode(type, current.length)])
    window.setTimeout(() => {
      emitSnapshot()
    }, 0)
  }

  function getClipboardNodePosition() {
    const stageRect = stageRef.current?.getBoundingClientRect()
    const currentViewport = flowRef.current?.getViewport() ?? viewportRef.current
    const zoom = currentViewport.zoom || 1
    const centerX = (stageRect?.width ?? 960) / 2
    const centerY = (stageRect?.height ?? 680) / 2
    const offset = (nodes.length % 6) * 24

    return {
      x: (centerX - currentViewport.x) / zoom + offset - 120,
      y: (centerY - currentViewport.y) / zoom + offset - 80,
    }
  }

  const addNodeFromClipboard = useCallback((payload: ClipboardImportPayload) => {
    setNodes((currentNodes) => {
      const nextNode = createNodeFromClipboardPayload(payload, getClipboardNodePosition())
      const nextNodes = [...currentNodes, nextNode]
      onSelectionChange?.({ nodeIds: [nextNode.id], edgeIds: [] })
      window.setTimeout(() => emitSnapshotWith(nextNodes, edges), 0)
      return nextNodes
    })
    setPendingPaste(null)
  }, [edges, emitSnapshotWith, nodes.length, onSelectionChange, setNodes])

  const overwriteNodeFromClipboard = useCallback((payload: ClipboardImportPayload, targetNodeId: string) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) =>
        node.id === targetNodeId ? applyClipboardPayloadToNode(node, payload) : node,
      )
      onSelectionChange?.({ nodeIds: [targetNodeId], edgeIds: [] })
      window.setTimeout(() => emitSnapshotWith(nextNodes, edges), 0)
      return nextNodes
    })
    setPendingPaste(null)
  }, [edges, emitSnapshotWith, onSelectionChange, setNodes])

  const handleClipboardPayload = useCallback((payload: ClipboardImportPayload) => {
    const conflictTarget = getPasteConflictTarget({
      selectedNodeIds,
      nodes,
      payload,
    })

    if (conflictTarget) {
      setPendingPaste({ payload, targetNodeId: conflictTarget.id })
      return
    }

    addNodeFromClipboard(payload)
  }, [addNodeFromClipboard, nodes, selectedNodeIds])

  const handlePaste = useCallback(async (event: ClipboardEvent | React.ClipboardEvent) => {
    if (isEditablePasteTarget(event.target)) return
    if (!event.clipboardData) return

    const payload = await parseClipboardImport(event.clipboardData)
    if (!payload) return

    event.preventDefault()
    handleClipboardPayload(payload)
  }, [handleClipboardPayload])

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      void handlePaste(event)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handlePaste])

  function updateZoomLabel() {
    if (!flowRef.current) return
    setZoomLabel(`${Math.round(flowRef.current.getZoom() * 100)}%`)
  }

  function getGroupNodeIds(groupId: string) {
    return nodes.filter((node) => node.data.groupId === groupId).map((node) => node.id)
  }

  function handleGroupPointerDown(event: React.PointerEvent<HTMLDivElement>, groupId: string) {
    event.preventDefault()
    event.stopPropagation()

    const nodeIds = getGroupNodeIds(groupId)
    if (nodeIds.length === 0) return

    groupDragStateRef.current = {
      groupId,
      nodeIds,
      pointerId: event.pointerId,
    }
    setDraggingGroupId(groupId)

    onSelectionChange?.({ nodeIds, edgeIds: [] })
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const dragState = groupDragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId) return

      const zoom = viewportRef.current.zoom || 1
      if (event.movementX === 0 && event.movementY === 0) return

      let nextGuides: GuideLine[] = []
      setNodes((current) => {
        const result = applyGroupDragMove(
          current,
          dragState.nodeIds,
          event.movementX,
          event.movementY,
          zoom,
          isGridSnapEnabled,
        )
        nextGuides = result.guides
        return result.nodes
      })
      setGuideLines(nextGuides)
    }

    function onPointerUp(event: PointerEvent) {
      const dragState = groupDragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId) return

      groupDragStateRef.current = null
      setDraggingGroupId(null)
      setGuideLines([])
      window.setTimeout(() => {
        emitSnapshot()
      }, 0)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [emitSnapshot, isGridSnapEnabled, onSelectionChange, setNodes])

  const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: WorkspaceNode) => {
    const currentNodes = flowRef.current?.getNodes() as WorkspaceNode[] | undefined
    if (!currentNodes) return

    const draggedGroupNodes =
      draggedNode.selected
        ? currentNodes.filter((node) => node.selected)
        : currentNodes.filter((node) => node.id === draggedNode.id)
    const draggedGroupIds = new Set(draggedGroupNodes.map((node) => node.id))
    const dragGuides = getDragGuides(currentNodes, draggedGroupIds, isGridSnapEnabled)

    setGuideLines(dragGuides.guides)
  }, [isGridSnapEnabled])

  const handleMoveEnd = useCallback(() => {
    updateZoomLabel()
    if (flowRef.current) {
      const nextViewport = flowRef.current.getViewport()
      setViewport(nextViewport)
      viewportRef.current = nextViewport
    }
    scheduleSnapshotSave()
  }, [scheduleSnapshotSave])

  const handleNodeDragStop = useCallback(() => {
    setGuideLines([])
    if (flowRef.current) {
      const nextViewport = flowRef.current.getViewport()
      setViewport(nextViewport)
      viewportRef.current = nextViewport
    }
    scheduleSnapshotSave()
  }, [scheduleSnapshotSave])

  return (
    <div
      ref={stageRef}
      className="relative h-full min-h-[680px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--canvas)] shadow-[var(--shadow-sm)] [&_.react-flow__edge-path]:transition-all [&_.react-flow__edge-path]:duration-150 [&_.react-flow__edge:hover_.react-flow__edge-path]:stroke-[var(--text-secondary)] [&_.react-flow__edge:hover_.react-flow__edge-path]:stroke-[1.9] [&_.react-flow__edge:hover_.react-flow__arrowhead]:fill-[var(--text-secondary)] [&_.react-flow__edge-textbg]:fill-[var(--panel)] [&_.react-flow__edge-textbg]:opacity-90 [&_.react-flow__edge-text]:fill-[var(--text-secondary)] [&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[var(--text-primary)] [&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[2.5] [&_.react-flow__edge.selected_.react-flow__edge-text]:fill-[var(--text-primary)] [&_.react-flow__edge.selected_.react-flow__arrowhead]:fill-[var(--text-primary)]"
    >
      <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2">
        {addableNodeTypes.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addNode(type)}
            className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
          >
            {label}
          </button>
        ))}
      </div>

      <ReactFlow
        defaultViewport={snapshot.viewport}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          flowRef.current = instance
          instance.setViewport(snapshot.viewport, { duration: 0 })
          const nextViewport = instance.getViewport()
          setViewport(nextViewport)
          viewportRef.current = nextViewport
          updateZoomLabel()
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onMoveEnd={handleMoveEnd}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          const currentNodes = ((flowRef.current?.getNodes() as WorkspaceNode[] | undefined) ?? [])
          const expandedNodeIds = expandSelectedNodeIdsByGroup(
            currentNodes,
            selectedNodes.map((node) => node.id),
          )

          onSelectionChange?.({
            nodeIds: expandedNodeIds,
            edgeIds: selectedEdges.map((edge) => edge.id),
          })
        }}
        defaultEdgeOptions={defaultEdgeOptions}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        deleteKeyCode={null}
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.8}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.25}
          color="var(--canvas-dot)"
        />
      </ReactFlow>

      {groupOverlays.map((group) => (
        <div
          key={group.groupId}
          className="pointer-events-none absolute z-[15]"
          style={getCanvasGroupOverlayStyle(group.bounds, viewport)}
        >
          <div
            className={`absolute inset-x-0 bottom-0 rounded-[24px] border border-dashed ${
              group.selected
                ? 'border-[var(--text-primary)] bg-[rgba(24,24,27,0.03)]'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.45)]'
            }`}
            style={{ top: 24 }}
          />
          <div
            className={`pointer-events-auto absolute left-3 top-0 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-[var(--shadow-sm)] transition-colors ${
              draggingGroupId === group.groupId
                ? 'cursor-grabbing border-[var(--text-primary)] bg-[var(--panel-elevated)]'
                : hoveredGroupId === group.groupId
                  ? 'cursor-grab border-[var(--text-primary)] bg-[var(--panel-elevated)]'
                  : 'cursor-grab border-[var(--border)] bg-[var(--panel)]'
            }`}
            onPointerDown={(event) => handleGroupPointerDown(event, group.groupId)}
            onPointerEnter={() => setHoveredGroupId(group.groupId)}
            onPointerLeave={() => setHoveredGroupId((current) => (current === group.groupId ? null : current))}
          >
            <button
              type="button"
              onClick={() => onSelectGroup?.(group.groupId)}
              onPointerDown={(event) => event.stopPropagation()}
              className="text-xs font-medium text-[var(--text-primary)]"
            >
              {group.label}
            </button>
            <span
              className={`text-[11px] ${
                draggingGroupId === group.groupId || hoveredGroupId === group.groupId
                  ? 'text-[var(--text-secondary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {group.memberCount}
            </span>
            <button
              type="button"
              onClick={() => onToggleGroupCollapse?.(group.groupId)}
              onPointerDown={(event) => event.stopPropagation()}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
            >
              {group.collapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ))}

      {guideLines.map((guide, index) =>
        guide.kind === 'alignment-vertical' ? (
          <div
            key={`guide-${index}`}
            className="pointer-events-none absolute z-20 w-px bg-[var(--text-primary)] opacity-60"
            style={{
              left: guide.x * viewport.zoom + viewport.x,
              top: guide.y * viewport.zoom + viewport.y,
              height: guide.length * viewport.zoom,
            }}
          />
        ) : guide.kind === 'alignment-horizontal' ? (
          <div
            key={`guide-${index}`}
            className="pointer-events-none absolute z-20 h-px bg-[var(--text-primary)] opacity-60"
            style={{
              left: guide.x * viewport.zoom + viewport.x,
              top: guide.y * viewport.zoom + viewport.y,
              width: guide.length * viewport.zoom,
            }}
          />
        ) : guide.kind === 'spacing-horizontal' ? (
          <div key={`guide-${index}`} className="pointer-events-none absolute inset-0 z-20">
            {guide.segments.map((segment, segmentIndex) => (
              <div
                key={`guide-${index}-segment-${segmentIndex}`}
                className="absolute h-px border-t border-dashed border-[var(--text-primary)] opacity-60"
                style={{
                  left: segment.x * viewport.zoom + viewport.x,
                  top: guide.y * viewport.zoom + viewport.y,
                  width: segment.length * viewport.zoom,
                }}
              />
            ))}
          </div>
        ) : (
          <div key={`guide-${index}`} className="pointer-events-none absolute inset-0 z-20">
            {guide.segments.map((segment, segmentIndex) => (
              <div
                key={`guide-${index}-segment-${segmentIndex}`}
                className="absolute w-px border-l border-dashed border-[var(--text-primary)] opacity-60"
                style={{
                  left: guide.x * viewport.zoom + viewport.x,
                  top: segment.y * viewport.zoom + viewport.y,
                  height: segment.length * viewport.zoom,
                }}
              />
            ))}
          </div>
        ),
      )}

      {nodes.length === 0 ? <CanvasEmptyState onAddNote={() => addNode('note')} /> : null}

      {pendingPaste ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(18,24,38,0.18)] px-4">
          <div className="w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)]">
            <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">检测到可粘贴内容</div>
            <p className="mb-5 text-sm leading-6 text-[var(--text-secondary)]">
              将作为新节点添加，还是覆盖当前选中节点？
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingPaste(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => addNodeFromClipboard(pendingPaste.payload)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
              >
                新增节点
              </button>
              <button
                type="button"
                onClick={() =>
                  pendingPaste.targetNodeId
                    ? overwriteNodeFromClipboard(pendingPaste.payload, pendingPaste.targetNodeId)
                    : addNodeFromClipboard(pendingPaste.payload)
                }
                className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--background)]"
              >
                覆盖当前
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ZoomControls
        zoomLabel={zoomLabel}
        snapEnabled={isGridSnapEnabled}
        onZoomIn={() => {
          flowRef.current?.zoomIn({ duration: 180 })
          window.setTimeout(updateZoomLabel, 190)
        }}
        onZoomOut={() => {
          flowRef.current?.zoomOut({ duration: 180 })
          window.setTimeout(updateZoomLabel, 190)
        }}
        onReset={() => {
          flowRef.current?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })
          window.setTimeout(() => {
            updateZoomLabel()
            emitSnapshot()
          }, 230)
        }}
        onToggleSnap={() => setIsGridSnapEnabled((current) => !current)}
      />
    </div>
  )
}
